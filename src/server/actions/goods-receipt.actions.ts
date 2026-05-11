// src/server/actions/goods-receipt.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb as db } from '@/server/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { Party, Item, StockMove, Uom, Lot, QcStatus } from '@/domain/ssot';
// ✅ SSOT V2: Importar servicios canónicos
import { LotService } from '@/services/canonical/lot.service';
import { OnHandService } from '@/services/canonical/onhand.service';

// Tipos legacy locales (a migrar progresivamente)
type ItemCategory = string;
type PartyRole = { id: string; partyId: string; role: string; isActive: boolean; createdAt: string; data?: any };
type GoodsReceipt = {
  id: string;
  receiptNumber: string;
  supplierPartyId: string;
  deliveryNote: string;
  receivedAt: string;
  status: string;
  lines: Array<{ itemId: string; sku: string; qty: number; uom: string; unitCost?: number; lotCode: string }>; // Usar itemId
  notes?: string;
};
import { LotSchema } from '@/domain/validators';
import { normText } from '@/lib/norm/text';
import { makeGoodsReceiptCode } from '@/lib/codes';
// Eliminar makeOnHandId si OnHandService lo maneja
// import { makeOnHandId } from '@/domain/id-helpers';
import { normalizeUom } from '@/domain/uom';
import { TraceEventFactory } from '@/lib/trace/TraceEventFactory';

// --- Helpers (Añadidos para corregir errores) ---

// Función para generar SKU (similar a SkuService.makeSku de SSOT V2)
const uniqueSku = (base: string, existingSkus: string[]) => {
  let candidate = base, i = 1;
  while (existingSkus.includes(candidate)) { i += 1; candidate = `${base}-${i}`; }
  return candidate;
};
const makeSku = (name: string, category: string, existingSkus: string[]) => {
  const cat = (category || 'raw').toUpperCase().slice(0, 3);
  const slug = normText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase().slice(0, 12);
  return uniqueSku(`${cat}-${slug || 'ITEM'}`, existingSkus);
};

// Función para determinar estado QC inicial
const initialQcStatusForItemCategory = (category?: ItemCategory): QcStatus => {
  const criticalCategories: (ItemCategory | undefined)[] = ['raw', 'pack', 'fg', 'intermediate'];
  return criticalCategories.includes(category) ? 'PENDING' : 'PASSED'; // Asumiendo PENDING o PASSED
};

// Función para determinar ubicación por categoría
function getLocationForCategory(category?: ItemCategory): string {
    if (!category) return 'DEFAULT/UNKNOWN'; // Ubicación por defecto

    const cat = category.toUpperCase();
    if (cat.startsWith('RAW')) return 'RM/MAIN'; // Materias Primas
    if (cat.startsWith('PACK')) return 'PKG/MAIN'; // Packaging
    if (cat.startsWith('FG')) return 'FG/MAIN'; // Producto Terminado
    if (cat.startsWith('INTERMEDIATE')) return 'WIP/LINE1'; // Producto Intermedio

    return 'DEFAULT/GENERAL'; // Otros
}

// === Server Actions ===

// Función createSupplier (Añadida para corregir error)
export async function createSupplier(payload: { name: string; taxId?: string }): Promise<{ id: string; name: string }> {
    const { name, taxId } = payload;
    const nowIso = new Date().toISOString();

    // Crear Account con role SUPPLIER
    const accountRef = db.collection('accounts').doc(); // Usar 'accounts' si es el nombre correcto
    const newAccount = {
        id: accountRef.id,
        kind: 'ORG' as const,
        roles: ['SUPPLIER' as const],
        displayName: name,
        legalName: name,
        name: name, // Campo 'name' a menudo se usa para búsqueda
        nameNorm: normText(name), // Nombre normalizado para búsqueda insensible
        vat: taxId,
        status: 'Activa', // Asumiendo estado inicial
        stage: 'ACTIVA' as const, // Asumiendo etapa inicial
        source: 'MANUAL', // Origen de la creación
        createdAt: nowIso,
        updatedAt: nowIso,
        // Añadir schemaVersion si aplica
        schemaVersion: 1,
    };

    await accountRef.set(newAccount);

    revalidatePath('/contacts'); // Revalidar rutas relevantes
    revalidatePath('/warehouse/goods-receipt');
    revalidatePath('/warehouse/inventory');

    return { id: newAccount.id, name: newAccount.displayName };
}


// Función createItem expandida con todos los detalles
export async function createItem(payload: { 
  name: string; 
  sku?: string; 
  uom: Uom; 
  category?: ItemCategory; 
  stdCost?: number;
  eanCode?: string;
  packagingType?: string;
  priceBase?: number;
  logistics?: {
    unitsPerCase?: number;
    casesPerPallet?: number;
    weightPerUnit?: number;
    volumePerUnit?: number;
    bottleMl?: number;
  };
}): Promise<Item> {
    const { name, sku, uom, category, stdCost, eanCode, packagingType, priceBase, logistics } = payload;
    const itemsSnap = await db.collection('items').get();
    const existingSkus = itemsSnap.docs.map(d => d.data().sku).filter(Boolean);
    const catCode = category || 'raw'; // Categoría por defecto

    const itemRef = db.collection('items').doc();
    const newItem: Item = {
        id: itemRef.id,
        name,
        sku: sku || makeSku(name, catCode, existingSkus),
        uom: normalizeUom(uom),
        kind: 'PRODUCT',
        trackStock: true,
        category: catCode,
        stdCost: stdCost || 0,
        active: true,
        isActive: true,
        // Campos adicionales opcionales
        ...(eanCode && { eanCode }),
        ...(packagingType && { packagingType }),
        ...(priceBase && { priceBase }),
        ...(logistics?.unitsPerCase && { unitsPerCase: logistics.unitsPerCase }),
        ...(logistics?.casesPerPallet && { casesPerPallet: logistics.casesPerPallet }),
        ...(logistics?.weightPerUnit && { weightPerUnit: logistics.weightPerUnit }),
        ...(logistics?.volumePerUnit && { volumePerUnit: logistics.volumePerUnit }),
        ...(logistics?.bottleMl && { bottleMl: logistics.bottleMl }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
    } as Item;

    await itemRef.set(
      { ...newItem, createdAt: new Date(), updatedAt: new Date() }, // Usar objetos Date
      { merge: true }
    );
    revalidatePath('/items');
    revalidatePath('/warehouse/goods-receipt');
    return newItem;
}


// Función createGoodsReceipt (Con correcciones de transacción y dependencias)
export async function createGoodsReceipt(payload: {
  supplierId?: string;
  newSupplierName?: string;
  deliveryNote: string;
  receiptDate: string;
  notes?: string;
  lines: Array<{
    itemId?: string;
    sku?: string;
    newItemName?: string;
    newItemCategory?: Item['category'];
    supplierLot: string;
    qty: number;
    unitCost?: number;
    uom?: Uom;
    expiryAt?: string | null;
    autoLot?: boolean; // No usado si usamos LotService.createLot
  }>;
}) {
  const { supplierId, newSupplierName, deliveryNote, receiptDate, notes, lines } = payload;
  const userId = 'system'; // TODO: Obtener de la sesión

  if ((!supplierId && !newSupplierName) || !deliveryNote || !lines?.length) {
    throw new Error('Proveedor, albarán y al menos una línea son obligatorios.');
  }

  try {
    const nowIso = new Date(receiptDate).toISOString();
    const receiptTimestamp = new Date(receiptDate);

    let finalSupplierId = supplierId;
    if (newSupplierName && !supplierId) {
       // Usar la función definida arriba
      const newParty = await createSupplier({ name: newSupplierName });
      finalSupplierId = newParty.id;
    }
    if (!finalSupplierId) throw new Error('El proveedor es obligatorio.');

    // Pre-cargar datos fuera de la transacción para eficiencia
    const allItemsSnap = await db.collection('items').get();
    const existingItems = allItemsSnap.docs.map(doc => doc.data() as Item);
    const itemsById = new Map(existingItems.map(it => [it.id, it]));
    const itemsBySku = new Map(existingItems.map(it => [it.sku, it]));
    const existingSkus = existingItems.map(it => it.sku);

    const allReceipts = (await db.collection('goodsReceipts').select('receiptNumber').get())
      .docs.map((d: any) => d.data().receiptNumber).filter(Boolean);
    const receiptNumber = makeGoodsReceiptCode(allReceipts, receiptTimestamp);
    const receiptRef = db.collection('goodsReceipts').doc(); // Generar ID fuera

    // --- Inicio de la Transacción ---
    const transactionResult = await db.runTransaction(async (tx) => {
      const finalLines: GoodsReceipt['lines'] = [];
      const createdLotsInfo: Array<{ lotId: string; lotCode: string; itemId: string; qty: number; uom: Uom; locationId: string }> = [];

      for (const line of lines) {
        let itemId: string | undefined = line.itemId;
        let currentItem: Item | undefined;

        // Buscar item: Priorizar itemId, luego sku
        if (itemId) {
          currentItem = itemsById.get(itemId);
          // Si no lo encontramos por ID pero sí por SKU, usar el ID del encontrado por SKU
          if (!currentItem && line.sku) {
             const itemBySku = itemsBySku.get(line.sku);
             if (itemBySku) {
                currentItem = itemBySku;
                itemId = itemBySku.id;
             }
          }
        } else if (line.sku) {
          currentItem = itemsBySku.get(line.sku);
          itemId = currentItem?.id;
        }


        // Crear nuevo item SI ES NECESSARIO (dentro de la transacción)
        if (!itemId && line.newItemName) {
            const itemRef = db.collection('items').doc(); // Generar ID
            itemId = itemRef.id;
            const newItemSku = line.sku || makeSku(line.newItemName, line.newItemCategory || 'raw', existingSkus); // Usar helper
            const newItem: Item = {
                id: itemId,
                name: line.newItemName,
                sku: newItemSku,
                uom: normalizeUom(line.uom || 'UNIT'),
                kind: 'PRODUCT',
                trackStock: true,
                category: line.newItemCategory || 'raw',
                stdCost: line.unitCost || 0,
                active: true, // Campo legacy requerido por Item
                isActive: true, // Campo canónico SSOT V2
                createdAt: nowIso,
                updatedAt: nowIso,
                schemaVersion: 1,
            } as Item;
            tx.set(itemRef, { ...newItem, createdAt: new Date(), updatedAt: new Date() }, { merge: true }); // Usar Date objects
            // Actualizar mapas locales (importante si se crea más de uno en la tx)
            itemsById.set(itemId, newItem);
            itemsBySku.set(newItem.sku, newItem);
            currentItem = newItem;
            existingSkus.push(newItemSku);
        }

        if (!itemId || !currentItem) {
          console.warn(`[createGoodsReceipt TX] Línea sin item válido:`, line);
          throw new Error(`Item no encontrado o no se pudo crear para la línea: ${line.sku || line.newItemName}`);
        }
        if (!currentItem.uom) throw new Error(`El item ${itemId} (${currentItem.name}) no tiene UoM.`);

        // Generar lotCode usando LotService DENTRO de la transacción
        const locationId = getLocationForCategory(currentItem.category); // Usar helper
        const { lotId, lotCode } = await LotService.createLot(tx, { // Llamada correcta a LotService
          itemId: itemId,
          plant: 'SB', // TODO: Configurable
          line: undefined,
          quantity: line.qty,
          uom: normalizeUom(currentItem.uom),
          locationId: locationId,
          supplierId: finalSupplierId,
          externalLot: line.supplierLot?.trim() || undefined,
          userId: userId,
          // expiryAt: line.expiryAt ? new Date(line.expiryAt) : undefined, // Si createLot lo soporta
        });

        // Opcional: Actualizar lote con datos adicionales si createLot no los maneja
        const lotRef = db.collection('lots').doc(lotId);
        const sanitizedExpiryAt = line.expiryAt && typeof line.expiryAt === 'string' && line.expiryAt.trim()
          ? line.expiryAt.trim()
          : null;
        tx.set(lotRef, {
            deliveryNote: deliveryNote || undefined,
            expiryAt: sanitizedExpiryAt ? new Date(sanitizedExpiryAt) : null, // Guardar como Date o null
            qcStatus: initialQcStatusForItemCategory(currentItem.category), // Asegurar estado QC inicial
        }, { merge: true });

        // OnHand ya es creado por LotService.createLot en bucket HOLD

        // Crear StockMove (canónico)
        const smRef = db.collection('stockMoves').doc();
        const stockMove = {
          id: smRef.id,
          itemId,
          lotCode,
          qty: line.qty,
          uom: normalizeUom(currentItem.uom),
          reason: 'RECEIPT',
          fromLocationId: 'SUPPLIER_VIRTUAL',
          toLocationId: locationId,
          occurredAt: receiptTimestamp,
          createdAt: new Date(),
          userId: userId,
          docRef: { type: 'GOODS_RECEIPT', id: receiptRef.id },
          unitCost: line.unitCost,
          schemaVersion: 1,
        };
        tx.set(smRef, stockMove);

        // Crear TraceEvent (canónico)
        const teRef = db.collection('traceEvents').doc();
          tx.set(teRef, {
            id: teRef.id,
            kind: 'STOCK_IN',
            occurredAt: receiptTimestamp,
            createdAt: new Date(),
            itemId: itemId,
            lotCode: lotCode,
            qty: line.qty,
            uom: normalizeUom(currentItem.uom),
            toLocationId: locationId,
            docRef: { type: 'GOODS_RECEIPT', id: receiptRef.id },
            userId: userId,
            schemaVersion: 1,
          });

        finalLines.push({
          itemId: itemId,
          sku: currentItem.sku,
          qty: line.qty,
          uom: normalizeUom(currentItem.uom),
          unitCost: line.unitCost,
          lotCode,
        });
        createdLotsInfo.push({ lotId, lotCode, itemId, qty: line.qty, uom: normalizeUom(currentItem.uom), locationId });
      } // Fin del bucle de líneas

      // Determinar si requiere QC basado en items reales
      const requiresQc = createdLotsInfo.some(({ itemId }) => {
        // Usar itemsById (actualizado si se crearon nuevos)
        const item = itemsById.get(itemId);
        const cat = item?.category;
        return cat === 'raw' || cat === 'pack' || cat === 'fg' || cat === 'intermediate';
      });

      // Crear GoodsReceipt (documento)
      const receipt: Omit<GoodsReceipt, 'id'> & { notes?: string; createdAt: Date; updatedAt: Date; schemaVersion: number } = {
        receiptNumber,
        supplierPartyId: finalSupplierId!,
        deliveryNote,
        receivedAt: nowIso,
        status: requiresQc ? 'qc_hold' : 'completed',
        lines: finalLines,
        notes: notes || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 1,
      };
      tx.set(receiptRef, receipt);

      // Devolver datos necesarios para post-transacción
      return { receiptId: receiptRef.id, receiptNumber, finalSupplierId, finalLines, requiresQc, notes };
    }); // --- Fin de la Transacción ---

    // --- Post-Transacción ---
    const supplierAccount = await db.collection('accounts').doc(transactionResult.finalSupplierId).get();
    const supplierName = supplierAccount.exists ? (supplierAccount.data()?.displayName || supplierAccount.data()?.name || 'Proveedor') : 'Proveedor';

    // TraceEvent general de la recepción (si decides tener uno además de los de línea)
    // await TraceEventFactory.logReceipt({ ... });

    revalidatePath('/warehouse/inventory');
    revalidatePath('/warehouse/goods-receipt');

    return {
        id: transactionResult.receiptId,
        receiptId: transactionResult.receiptId,
        receiptNumber: transactionResult.receiptNumber,
        supplierId: transactionResult.finalSupplierId,
    };

  } catch (e: any) {
    console.error(`[ACTION:createGoodsReceipt] Failed. Payload:`, JSON.stringify(payload, null, 2), `Error:`, e);
    throw new Error(e.message || "Error interno del servidor al crear la recepción.");
  }
}
