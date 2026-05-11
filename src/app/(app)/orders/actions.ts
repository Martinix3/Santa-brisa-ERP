/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/orders/actions.ts
'use server';
import 'server-only';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import type { OrderSellOut, OrderLine, Account, Item, Lot, OnHandView } from '@/domain/ssot';
import { sortLotsByFEFO, validateLotConsumption, selectBestLotFEFO } from '@/lib/inventory-validation';
import { TraceEventFactory } from '@/lib/trace/TraceEventFactory';
import { logGeminiContext } from '@/server/gemini/context-logger';

/**
 * Schema de validación para crear un pedido
 */
const PlaceOrderSchema = z.object({
  accountId: z.string().min(1, 'ID de cuenta requerido'),
  lines: z.array(
    z.object({
      itemId: z.string().min(1, 'ID de producto requerido'),
      qty: z.number().positive('Cantidad debe ser positiva'),
      priceUnit: z.number().nonnegative('Precio debe ser no negativo'),
      discountPct: z.number().min(0).max(100).optional(),
    })
  ).min(1, 'Debe haber al menos una línea en el pedido'),
  source: z.enum(['SHOPIFY', 'B2B', 'Direct', 'CRM', 'MANUAL', 'HOLDED']).optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
});

type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;

interface PlaceOrderResult {
  ok: boolean;
  orderId?: string;
  error?: string;
  warnings?: string[];
  suggestedLots?: Record<string, { lotNumber: string; available: number }>;
}

/**
 * Crea un nuevo pedido de venta con validaciones completas
 * 
 * Flujo:
 * 1. Validar input con Zod
 * 2. Verificar cuenta y productos existen
 * 3. Validar stock disponible usando FEFO
 * 4. Validar QC de lotes sugeridos
 * 5. Crear pedido en estado 'open'
 * 6. Registrar TraceEvent
 * 7. Crear tarea automática si es necesario
 * 
 * @param input - Datos del pedido
 * @returns Resultado con ID del pedido o error
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    // 1. Validar input
    const validated = PlaceOrderSchema.parse(input);
    
    // 2. Verificar cuenta existe
    const account = await getOne<Account>('accounts', validated.accountId);
    if (!account) {
      return { ok: false, error: `Cuenta ${validated.accountId} no encontrada` };
    }
    
    const isDirect = account.flow === 'DIRECT';
    
    // 3. Para pedidos de COLOCACIÓN, crear sin validar lotes (el distribuidor reporta venta)
    if (!isDirect) {
      const now = new Date().toISOString();
      const orderRef = db.collection('ordersSellOut').doc();
      
      const enrichedLines: OrderLine[] = validated.lines.map(line => ({
        itemId: line.itemId,
        sku: line.itemId,
        name: line.itemId, // Se enriquecerá después si es necesario
        qty: line.qty,
        uom: 'unit',
        priceUnit: line.priceUnit,
        discountPct: line.discountPct || 0,
      }));
      
      const totalAmount = enrichedLines.reduce((sum, line) => {
        const lineTotal = line.qty * line.priceUnit * (1 - (line.discountPct || 0) / 100);
        return sum + lineTotal;
      }, 0);
      
      const newOrder: OrderSellOut = {
        id: orderRef.id,
        accountId: validated.accountId,
        partyId: account.partyId,
        flow: 'PLACEMENT',
        distributorPartyId: account.distributorPartyId,
        isSellOutReported: true, // Marca como sell-out reportado
        status: 'open',
        billingStatus: 'pending',
        lines: enrichedLines,
        totalAmount,
        currency: 'EUR',
        source: validated.source || 'MANUAL',
        notes: validated.notes,
        orderDate: now,
        createdAt: now,
        updatedAt: now,
        createdById: validated.userId,
      };
      
      await orderRef.set(newOrder);
      
      // Escalar stage de la cuenta a ACTIVA
      try {
        const accountRef = db.collection('accounts').doc(validated.accountId);
        const snap = await accountRef.get();
        if (snap.exists) {
          const acc = snap.data() as Account | undefined;
          const current = (acc?.stage as any) || 'POTENCIAL';
          const rank: Record<string, number> = { POTENCIAL: 1, SEGUIMIENTO: 2, ACTIVA: 3, FALLIDA: 0, CERRADA: 0, BAJA: 0 };
          const nowIso = new Date().toISOString();
          if ((rank[current] ?? 0) < rank['ACTIVA']) {
            await accountRef.update({ stage: 'ACTIVA', updatedAt: nowIso, lastInteractionAt: nowIso });
          } else {
            await accountRef.update({ lastInteractionAt: nowIso, updatedAt: nowIso });
          }
        }
      } catch (e) {
        console.error('[placeOrder] Escalar stage falló:', e);
      }
      
      // TraceEvent para colocación
      try {
        await TraceEventFactory.create({
          kind: 'SALE',
          phase: 'SALE',
          title: 'Pedido de colocación reportado',
          details: `Sell-out reportado por distribuidor para ${account.name}. Total: €${totalAmount.toFixed(2)}`,
          links: { orderId: orderRef.id },
          data: {
            accountId: validated.accountId,
            accountName: account.name,
            flow: 'PLACEMENT',
            isSellOutReported: true,
            lines: enrichedLines.map(l => ({ itemId: l.itemId, qty: l.qty })),
            totalAmount,
          },
          userId: validated.userId,
        });
      } catch (error) {
        console.error('[placeOrder] Error logging TraceEvent:', error);
      }
      
      revalidatePath('/orders');
      revalidatePath(`/accounts/${validated.accountId}`);
      
      return {
        ok: true,
        orderId: orderRef.id,
        warnings: ['ℹ️ Pedido de colocación: no se valida stock ni lotes (sell-out reportado)'],
      };
    }
    
    // 4. SOLO PARA VENTA DIRECTA: Cargar datos necesarios para validación de lotes
    const [itemsSnap, lotsSnap, onHandSnap] = await Promise.all([
      db.collection('items').get(),
      db.collection('lots').get(),
      db.collection('onHand').get(),
    ]);
    
    const itemsById = new Map(
      itemsSnap.docs.map(doc => [doc.id, doc.data() as Item])
    );
    const lots = lotsSnap.docs.map(doc => doc.data() as Lot);
    const onHand = onHandSnap.docs.map(doc => doc.data() as OnHandView);
    
    // 4. Validar que todos los items existen y enriquecer líneas
    const enrichedLines: OrderLine[] = [];
    const warnings: string[] = [];
    const suggestedLots: Record<string, { lotNumber: string; available: number }> = {};
    
    for (const line of validated.lines) {
      const item = itemsById.get(line.itemId);
      if (!item) {
        return { ok: false, error: `Producto ${line.itemId} no encontrado` };
      }
      
      if (!item.active && !item.isActive) {
        warnings.push(`⚠️ ${item.name} está marcado como inactivo`);
      }
      
      // 5. Verificar stock disponible con FEFO y QC
      const itemLots = lots.filter(lot => 
        (lot.itemId === line.itemId || lot.sku === line.itemId) &&
        lot.quantity > 0
      );
      
      if (itemLots.length === 0) {
        return { 
          ok: false, 
          error: `No hay lotes disponibles para ${item.name}` 
        };
      }
      
      // Filtrar lotes por FEFO con validación QC
      const consumableLots = sortLotsByFEFO(itemLots);
      
      if (consumableLots.length === 0) {
        const allPending = itemLots.every(l => l.qcStatus === 'PENDING');
        const allHold = itemLots.every(l => l.qcStatus === 'HOLD');
        
        if (allPending) {
          return {
            ok: false,
            error: `${item.name}: Todos los lotes están pendientes de QC. No se puede crear el pedido hasta que sean aprobados.`
          };
        } else if (allHold) {
          return {
            ok: false,
            error: `${item.name}: Todos los lotes están retenidos por QC. Contacte al departamento de Calidad.`
          };
        } else {
          return {
            ok: false,
            error: `${item.name}: No hay lotes aprobados disponibles. Verifique el estado QC.`
          };
        }
      }
      
      // Seleccionar mejor lote según FEFO
      const bestLot = selectBestLotFEFO(consumableLots, line.qty);
      
      if (!bestLot) {
        const totalAvailable = consumableLots.reduce((sum, l) => sum + l.quantity, 0);
        if (totalAvailable < line.qty) {
          return {
            ok: false,
            error: `${item.name}: Stock insuficiente. Necesita ${line.qty}, disponible ${totalAvailable}`
          };
        } else {
          warnings.push(
            `${item.name}: Necesita ${line.qty} unidades. ` +
            `El mejor lote (${consumableLots[0].lotNumber}) tiene ${consumableLots[0].quantity}. ` +
            `Deberá usar múltiples lotes.`
          );
        }
      } else {
        suggestedLots[line.itemId] = {
          lotNumber: bestLot.lotNumber,
          available: bestLot.quantity
        };
        
        // Validar explícitamente el lote seleccionado
        try {
          validateLotConsumption(bestLot);
        } catch (error: any) {
          return {
            ok: false,
            error: `${item.name}: ${error.message}`
          };
        }
      }
      
      enrichedLines.push({
        itemId: line.itemId,
        sku: line.itemId,
        name: item.name,
        qty: line.qty,
        uom: 'unit',
        priceUnit: line.priceUnit,
        discountPct: line.discountPct || 0,
      });
    }
    
    // 6. Calcular total del pedido
    const totalAmount = enrichedLines.reduce((sum, line) => {
      const lineTotal = line.qty * line.priceUnit * (1 - (line.discountPct || 0) / 100);
      return sum + lineTotal;
    }, 0);
    
    // 7. Crear pedido
    const now = new Date().toISOString();
    const orderRef = db.collection('ordersSellOut').doc();
    
    const newOrder: OrderSellOut = {
      id: orderRef.id,
      accountId: validated.accountId,
      partyId: account.partyId,
      flow: account.flow || 'DIRECT',
      distributorPartyId: account.distributorPartyId,
      status: 'open',
      billingStatus: 'pending',
      lines: enrichedLines,
      totalAmount,
      currency: 'EUR',
      source: validated.source || 'MANUAL',
      notes: validated.notes,
      orderDate: now,
      createdAt: now,
      updatedAt: now,
      createdById: validated.userId,
    };
    
    await orderRef.set(newOrder);
    
    // Escalar stage de la cuenta a ACTIVA (venta directa)
    try {
      const accountRef = db.collection('accounts').doc(validated.accountId);
      const snap = await accountRef.get();
      if (snap.exists) {
        const acc = snap.data() as Account | undefined;
        const current = (acc?.stage as any) || 'POTENCIAL';
        const rank: Record<string, number> = { POTENCIAL: 1, SEGUIMIENTO: 2, ACTIVA: 3, FALLIDA: 0, CERRADA: 0, BAJA: 0 };
        const nowIso = new Date().toISOString();
        if ((rank[current] ?? 0) < rank['ACTIVA']) {
          await accountRef.update({ stage: 'ACTIVA', updatedAt: nowIso, lastInteractionAt: nowIso });
        } else {
          await accountRef.update({ lastInteractionAt: nowIso, updatedAt: nowIso });
        }
      }
    } catch (e) {
      console.error('[placeOrder] Escalar stage falló:', e);
    }
    
    // 8. Registrar TraceEvent
    try {
      await TraceEventFactory.create({
        kind: 'SALE',
        phase: 'SALE',
        title: 'Pedido creado',
        details: `Pedido ${orderRef.id} creado para ${account.name}. Total: €${totalAmount.toFixed(2)}`,
        links: {
          orderId: orderRef.id,
        },
        data: {
          accountId: validated.accountId,
          accountName: account.name,
          lines: enrichedLines.map(l => ({
            itemId: l.itemId,
            name: l.name,
            qty: l.qty,
          })),
          totalAmount,
          suggestedLots,
        },
        userId: validated.userId,
      });
    } catch (error) {
      console.error('[placeOrder] Error logging TraceEvent:', error);
      // Non-blocking - continuar aunque falle el trace
    }
    
    // 9. Revalidar rutas
    revalidatePath('/orders');
    revalidatePath(`/accounts/${validated.accountId}`);
    
    return {
      ok: true,
      orderId: orderRef.id,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestedLots,
    };
    
  } catch (error) {
    console.error('[placeOrder] Error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: `Validación falló: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear pedido'
    };
  }
}

/**
 * Crea un pedido rápido desde distribuidores (colocación)
 * TODO: Implementar lógica específica para pedidos de colocación
 */
export async function placeQuickOrder(input: any): Promise<PlaceOrderResult> {
  // Por ahora, delegar a placeOrder
  return placeOrder(input);
}

/**
 * Importa un pedido desde Shopify
 * TODO: Implementar integración con Shopify
 */
export async function importShopifyOrder(input: any) {
  return { ok: true, message: 'Shopify import - pendiente de implementación' };
}

/**
 * Crea una factura desde un pedido
 * TODO: Implementar creación de factura
 */
export async function createSalesInvoice(input: any) {
  return { ok: true, message: 'Invoice creation - pendiente de implementación' };
}
