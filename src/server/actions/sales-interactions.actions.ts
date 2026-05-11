// src/server/actions/sales-interactions.actions.ts
'use server';

import { adminDb } from '@/server/firebase';
import type { Interaction, MarketingEvent, OrderSellOut, OrderLine } from '@/domain/ssot';

/**
 * Crear interacción desde RegisterInteractionDrawer
 * Mapea a colección 'interactions' de SSOT V2 Plus
 */
export async function createInteraction(data: {
  accountId: string;
  type: 'VISITA' | 'LLAMADA' | 'EMAIL' | 'REUNION' | 'OTRO';
  date: string;  // ISO datetime
  duration: number;  // minutos
  notes: string;
  outcome?: string;
  nextAction?: string;
  userId: string;
  isPast?: boolean;  // true = registrar pasada, false = programar futura
}) {
  try {
    // Mapear REUNION a OTRO ya que no existe en InteractionKind
    const kindMap: Record<string, 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO'> = {
      'VISITA': 'VISITA',
      'LLAMADA': 'LLAMADA',
      'EMAIL': 'EMAIL',
      'REUNION': 'OTRO',  // REUNION no existe en SSOT, usar OTRO
      'OTRO': 'OTRO',
    };

    const interaction: Partial<Interaction> = {
      accountId: data.accountId,
      userId: data.userId,
      kind: kindMap[data.type],
      note: data.notes,
      plannedFor: data.date,
      status: data.isPast !== false ? 'done' : 'open',  // done si es pasada, open si es futura
      resultNote: data.nextAction,
      outcome: data.outcome ? { type: data.outcome } : undefined,
      dept: 'VENTAS',
      durationMin: data.duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('interactions').add(interaction);
    
    // Actualizar Account: solo lastInteractionAt (el stage lo calcula el pipeline)
    await adminDb.collection('accounts').doc(data.accountId).update({
      lastInteractionAt: data.date,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[createInteraction] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Crear evento de marketing desde RegisterEventDrawer
 * Mapea a colección 'marketingEvents' de SSOT V2 Plus
 */
export async function createMarketingEvent(data: {
  accountId: string;
  eventType: 'DEGUSTACION' | 'FORMACION' | 'FERIA' | 'PRESENTACION' | 'OTRO';
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: number;
  products?: string;
  budget?: number;
  notes?: string;
  userId: string;
}) {
  try {
    // Mapear tipo de evento a EventKind de SSOT
    const kindMap: Record<string, 'DEMO' | 'FERIA' | 'FORMACION' | 'OTRO'> = {
      'DEGUSTACION': 'DEMO',
      'FORMACION': 'FORMACION',
      'FERIA': 'FERIA',
      'PRESENTACION': 'OTRO',
      'OTRO': 'OTRO',
    };

    const event: Partial<MarketingEvent> = {
      title: data.title,
      kind: kindMap[data.eventType] || 'OTRO',
      accountId: data.accountId,
      startAt: `${data.date}T${data.startTime}`,
      endAt: `${data.date}T${data.endTime}`,
      city: data.location,
      spend: data.budget,
      status: 'planned',
      ownerUserId: data.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Campos custom en kpis
      kpis: {
        estimatedAttendees: data.attendees,
        products: data.products,
        description: data.description,
        notes: data.notes,
      },
    };

    const docRef = await adminDb.collection('marketingEvents').add(event);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[createMarketingEvent] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Registrar instalación de POS desde RegisterPOSDrawer
 * Usa Account.posInstallation (sin modificar SSOT)
 */
export async function registerPOSInstallation(data: {
  accountId: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  technician?: string;
  monthlyFee?: number;
  contractDuration: number;
  accessories: {
    printer: boolean;
    scanner: boolean;
    cashDrawer: boolean;
    cardReader: boolean;
  };
  notes?: string;
  userId: string;
}) {
  try {
    // Calcular fecha fin de contrato
    const startDate = new Date(data.installationDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.contractDuration);

    // Actualizar Account con información de POS
    await adminDb.collection('accounts').doc(data.accountId).update({
      posInstalled: true,
      posInstallation: {
        model: data.model,
        serialNumber: data.serialNumber,
        installationDate: data.installationDate,
        technician: data.technician,
        monthlyFee: data.monthlyFee,
        contractDuration: data.contractDuration,
        contractStartDate: data.installationDate,
        contractEndDate: endDate.toISOString(),
        accessories: data.accessories,
        notes: data.notes,
        status: 'ACTIVE',
        installedBy: data.userId,
        installedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('[registerPOSInstallation] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Crear pedido rápido desde QuickOrderDrawer
 * Mapea a colección 'ordersSellOut' de SSOT V2 Plus
 */
export async function createQuickOrder(data: {
  accountId: string;
  accountName: string;
  lines: Array<{
    itemId: string;
    productName: string;
    quantity: number;
    priceUnit: number;
  }>;
  notes?: string;
  userId: string;
}) {
  try {
    // Obtener partyId del account
    const accountSnap = await adminDb.collection('accounts').doc(data.accountId).get();
    const account = accountSnap.data();

    if (!account) {
      throw new Error('Account not found');
    }

    // Convertir líneas a OrderLine completo (ahora con itemId real)
    const orderLines: OrderLine[] = data.lines.map(line => ({
      itemId: line.itemId,
      name: line.productName,
      qty: line.quantity,
      uom: 'unit',
      priceUnit: line.priceUnit,
      discountPct: 0,
    }));

    const totalAmount = orderLines.reduce((sum, line) => 
      sum + (line.qty * line.priceUnit), 0
    );

    const order: Partial<OrderSellOut> = {
      accountId: data.accountId,
      partyId: account.partyId || 'UNKNOWN',
      customerName: data.accountName,
      lines: orderLines,
      totalAmount,
      currency: 'EUR',
      channel: 'PRIVATE',
      flow: 'PLACEMENT',
      source: 'MANUAL',
      status: 'open',
      notes: data.notes,
      orderDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: data.userId,
    };

    const docRef = await adminDb.collection('ordersSellOut').add(order);

    // NO actualizar stage - el pipeline lo calcula basándose en pedidos/interacciones
    // Solo actualizar timestamp
    await adminDb.collection('accounts').doc(data.accountId).update({
      updatedAt: new Date().toISOString(),
    });

    return { 
      success: true, 
      id: docRef.id,
      docNumber: docRef.id 
    };
  } catch (error) {
    console.error('[createQuickOrder] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Añadir nota rápida a una cuenta
 * Usa la colección 'notes' o campo Account.notes
 */
export async function addAccountNote(data: {
  accountId: string;
  text: string;
  userId: string;
}) {
  try {
    const note = {
      accountId: data.accountId,
      text: data.text,
      createdAt: new Date().toISOString(),
      createdBy: data.userId,
    };

    const docRef = await adminDb.collection('notes').add(note);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[addAccountNote] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}
