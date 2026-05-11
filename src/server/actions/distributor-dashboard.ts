// src/server/actions/distributor-dashboard.ts
'use server';

import { adminDb } from '@/server/firebase';
import { orderService } from '@/services/canonical/order.service';
import { OnHandService, type OnHand } from '@/services/canonical/onhand.service';
import type { OrderSellOut } from '@/domain/ssot';

// =================================================================
// TYPES
// =================================================================

export interface DistributorOrderSummary {
  id: string;
  docNumber?: string;
  status: OrderSellOut['status'];
  totalAmount: number;
  lineCount: number;
  createdAt: string;
  estimatedDelivery?: string;
  accountName?: string;
}

export interface DistributorKPIs {
  ordersCount: {
    pending: number;
    inTransit: number;
    delivered: number;
  };
  otifPercentage: number;
}

export interface DistributorStockItem {
  itemId: string;
  lotCode: string;
  quantity: number;
  availableQty: number;
  coverage: number;
  rotation: number;
  status: 'OK' | 'LOW' | 'CRITICAL';
  itemName?: string;
}

export interface DistributorStockSummary {
  totalValue: number;
  skuCount: number;
  avgRotation: number;
  avgCoverage: number;
}

export interface SellOutUploadResult {
  success: boolean;
  ordersCreated: number;
  errors?: string[];
}

export interface PlvMaterial {
  id: string;
  name: string;
  description: string;
  category: 'SIGNAGE' | 'DISPLAY' | 'PROMOTIONAL';
  availableQty: number;
  imageUrl?: string;
}

export interface DistributorFinances {
  creditLimit: number;
  creditUsed: number;
  creditAvailable: number;
  openInvoices: Array<{
    id: string;
    docNumber?: string;
    amount: number;
    dueDate?: string;
    status: string;
  }>;
  bonusAvailable: number;
}

// =================================================================
// VALIDATION
// =================================================================

function validateDistributorAccess(userId: string, partyId?: string): void {
  if (!partyId) {
    throw new Error('Usuario no tiene partyId de distribuidor');
  }
  // TODO: Validar rol DISTRIBUIDOR en Firestore
}

// =================================================================
// ORDERS - PEDIDOS DEL DISTRIBUIDOR
// =================================================================

/**
 * Obtiene los pedidos del distribuidor
 */
export async function getDistributorOrders(
  distributorPartyId: string,
  options?: {
    status?: OrderSellOut['status'][];
    limit?: number;
  }
): Promise<DistributorOrderSummary[]> {
  try {
    validateDistributorAccess('current-user', distributorPartyId);

    // Obtener todos los pedidos y filtrar manualmente por distributorPartyId
    // ya que orderService.queryOrders no acepta este campo directamente
    const allOrders = await orderService.queryOrders({
      limit: options?.limit || 100
    });

    // Filtrar por distributorPartyId y status
    const filteredOrders = allOrders.filter(order => {
      const matchesDistributor = order.distributorPartyId === distributorPartyId;
      const matchesStatus = !options?.status || options.status.includes(order.status);
      return matchesDistributor && matchesStatus;
    });

    return filteredOrders.slice(0, options?.limit || 50).map(order => ({
      id: order.id,
      docNumber: order.docNumber,
      status: order.status,
      totalAmount: order.totalAmount || 0,
      lineCount: order.lines?.length || 0,
      createdAt: typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString(),
      estimatedDelivery: calculateETA(order),
      accountName: order.customerName
    }));
  } catch (error) {
    console.error('Error fetching distributor orders:', error);
    throw new Error('Error al obtener pedidos del distribuidor');
  }
}

/**
 * Obtiene KPIs de pedidos del distribuidor
 */
export async function getDistributorOrderKPIs(
  distributorPartyId: string
): Promise<DistributorKPIs> {
  try {
    validateDistributorAccess('current-user', distributorPartyId);

    // Obtener pedidos del último mes
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];

    const allOrders = await orderService.queryOrders({
      dateFrom,
      limit: 500
    });

    // Filtrar por distributorPartyId
    const distributorOrders = allOrders.filter(o => o.distributorPartyId === distributorPartyId);

    // Calcular KPIs
    const pending = distributorOrders.filter(o => o.status === 'open' || o.status === 'confirmed').length;
    const inTransit = distributorOrders.filter(o => o.status === 'shipped').length;
    const delivered = distributorOrders.filter(o => o.status === 'invoiced' || o.status === 'paid').length;

    // Calcular OTIF (On Time In Full)
    const otif = calculateOTIF(distributorOrders);

    return {
      ordersCount: {
        pending,
        inTransit,
        delivered
      },
      otifPercentage: otif
    };
  } catch (error) {
    console.error('Error fetching distributor KPIs:', error);
    throw new Error('Error al obtener KPIs del distribuidor');
  }
}

// =================================================================
// SELL-OUT - REPORTE DE VENTAS
// =================================================================

/**
 * Procesa y crea pedidos desde datos de sell-out CSV
 */
export async function uploadSellOutData(
  distributorPartyId: string,
  csvData: string
): Promise<SellOutUploadResult> {
  try {
    validateDistributorAccess('current-user', distributorPartyId);

    // 1. Parsear CSV
    const parsed = parseCSV(csvData);
    
    // 2. Validar formato
    const validation = validateSellOutFormat(parsed);
    if (!validation.valid) {
      return {
        success: false,
        ordersCreated: 0,
        errors: validation.errors
      };
    }

    // 3. Crear OrderSellOut por cada línea
    const errors: string[] = [];
    let created = 0;

    for (const row of parsed) {
      try {
        await orderService.createOrder({
          orderNumber: `SELLOUT-${Date.now()}-${row.lineNumber}`,
          orderDate: new Date(row.date).toISOString(),
          lines: [{
            itemId: row.sku,
            qty: parseFloat(row.quantity),
            uom: 'unit' as const,
            priceUnit: parseFloat(row.price)
          }],
          distributorPartyId,
          flow: 'PLACEMENT',
          status: 'confirmed'
        });
        created++;
      } catch (error) {
        errors.push(`Error en línea ${row.lineNumber}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return {
      success: errors.length === 0,
      ordersCreated: created,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error uploading sell-out data:', error);
    throw new Error('Error al procesar datos de sell-out');
  }
}

/**
 * Obtiene datos de sell-out para gráficos
 */
export async function getSellOutData(
  distributorPartyId: string,
  weeks: number = 4
): Promise<Array<{ week: string; sellOut: number; stock: number }>> {
  try {
    validateDistributorAccess('current-user', distributorPartyId);

    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7));
    const dateFrom = weeksAgo.toISOString().split('T')[0];

    const allOrders = await orderService.queryOrders({
      dateFrom,
      limit: 500
    });

    // Filtrar por distributorPartyId y isSellOutReported
    const orders = allOrders.filter(o => 
      o.distributorPartyId === distributorPartyId && o.isSellOutReported
    );

    // Agrupar por semana
    const weeklyData = groupOrdersByWeek(orders, weeks);

    return weeklyData;
  } catch (error) {
    console.error('Error fetching sell-out data:', error);
    throw new Error('Error al obtener datos de sell-out');
  }
}

// =================================================================
// STOCK - INVENTARIO DEL DISTRIBUIDOR
// =================================================================

/**
 * Obtiene el stock del distribuidor
 */
export async function getDistributorStock(
  locationId: string
): Promise<DistributorStockItem[]> {
  try {
    // Obtener todos los OnHand para esta ubicación
    const snapshot = await adminDb.collection('onHand')
      .where('locationId', '==', locationId)
      .where('qty.RELEASED', '>', 0)
      .get();

    const onHandRecords = snapshot.docs.map(doc => doc.data() as OnHand);

    return onHandRecords.map(record => ({
      itemId: record.itemId,
      lotCode: record.lotCode,
      quantity: record.qty.RELEASED,
      availableQty: record.availableQty,
      coverage: calculateCoverage(record),
      rotation: calculateRotation(record),
      status: getStockStatus(record)
    }));
  } catch (error) {
    console.error('Error fetching distributor stock:', error);
    throw new Error('Error al obtener stock del distribuidor');
  }
}

/**
 * Obtiene resumen de stock del distribuidor
 */
export async function getDistributorStockSummary(
  locationId: string
): Promise<DistributorStockSummary> {
  try {
    const stock = await getDistributorStock(locationId);

    // Calcular métricas
    const totalValue = stock.reduce((sum, item) => sum + (item.quantity * 10), 0); // TODO: usar precio real
    const skuCount = new Set(stock.map(item => item.itemId)).size;
    const avgRotation = stock.reduce((sum, item) => sum + item.rotation, 0) / stock.length || 0;
    const avgCoverage = stock.reduce((sum, item) => sum + item.coverage, 0) / stock.length || 0;

    return {
      totalValue,
      skuCount,
      avgRotation: Math.round(avgRotation),
      avgCoverage: Math.round(avgCoverage)
    };
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    throw new Error('Error al obtener resumen de stock');
  }
}

// =================================================================
// PLV - MATERIAL PROMOCIONAL
// =================================================================

/**
 * Obtiene materiales PLV disponibles
 */
export async function getPlvMaterials(): Promise<PlvMaterial[]> {
  try {
    const snapshot = await adminDb.collection('plvMaterials')
      .where('availableQty', '>', 0)
      .orderBy('availableQty', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PlvMaterial));
  } catch (error) {
    console.error('Error fetching PLV materials:', error);
    throw new Error('Error al obtener materiales PLV');
  }
}

/**
 * Solicita material PLV
 */
export async function requestPlvMaterial(
  distributorPartyId: string,
  materialId: string,
  quantity: number
): Promise<{ success: boolean; requestId?: string }> {
  try {
    validateDistributorAccess('current-user', distributorPartyId);

    const requestRef = await adminDb.collection('plvRequests').add({
      distributorPartyId,
      materialId,
      quantity,
      status: 'PENDING',
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      success: true,
      requestId: requestRef.id
    };
  } catch (error) {
    console.error('Error requesting PLV material:', error);
    throw new Error('Error al solicitar material PLV');
  }
}

// =================================================================
// FINANZAS - CRÉDITO Y FACTURAS
// =================================================================

/**
 * Obtiene información financiera del distribuidor
 */
export async function getDistributorFinances(
  distributorPartyId: string
): Promise<DistributorFinances> {
  try {
    validateDistributorAccess('current-user', distributorPartyId);

    // 1. Obtener límite de crédito (TODO: integrar con Holded)
    const creditLimit = 50000; // Mock - debe venir de Holded

    // 2. Obtener facturas abiertas
    const allOrders = await orderService.queryOrders({ limit: 500 });
    const openInvoices = allOrders.filter(o => 
      o.distributorPartyId === distributorPartyId &&
      (o.billingStatus === 'pending' || o.billingStatus === 'invoiced')
    );

    // 3. Calcular crédito usado
    const creditUsed = openInvoices.reduce((sum, order) => 
      sum + (order.totalAmount || 0), 0
    );

    // 4. Calcular bonificación (TODO: implementar lógica real)
    const bonusAvailable = await calculateBonus(distributorPartyId);

    return {
      creditLimit,
      creditUsed,
      creditAvailable: creditLimit - creditUsed,
      openInvoices: openInvoices.map(order => ({
        id: order.id,
        docNumber: order.docNumber,
        amount: order.totalAmount || 0,
        dueDate: undefined, // TODO: Añadir campo dueDate a OrderSellOut
        status: order.billingStatus || 'pending'
      })),
      bonusAvailable
    };
  } catch (error) {
    console.error('Error fetching distributor finances:', error);
    throw new Error('Error al obtener información financiera');
  }
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

function calculateETA(order: OrderSellOut): string | undefined {
  if (order.status === 'shipped') {
    // Estimar 2-3 días desde envío
    const shipped = order.updatedAt || order.createdAt;
    if (shipped) {
      const shippedDate = typeof shipped === 'string' ? new Date(shipped) : shipped;
      const eta = new Date(shippedDate);
      eta.setDate(eta.getDate() + 2);
      return eta.toLocaleDateString('es-ES');
    }
  }
  return undefined;
}

function calculateOTIF(orders: OrderSellOut[]): number {
  // Calcular % de pedidos entregados a tiempo y completos
  const delivered = orders.filter(o => o.status === 'invoiced' || o.status === 'paid');
  if (delivered.length === 0) return 100;

  // TODO: Implementar lógica real de OTIF
  // Por ahora retornar un valor mock
  return 94;
}

function parseCSV(csvData: string): any[] {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim());
    const row: any = { lineNumber: index + 2 };
    
    headers.forEach((header, i) => {
      row[header] = values[i];
    });
    
    return row;
  });
}

function validateSellOutFormat(data: any[]): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  const requiredFields = ['date', 'accountId', 'sku', 'quantity', 'price'];

  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field]) {
        errors.push(`Línea ${index + 2}: Falta campo requerido '${field}'`);
      }
    });

    // Validar formato de fecha
    if (row.date && isNaN(Date.parse(row.date))) {
      errors.push(`Línea ${index + 2}: Formato de fecha inválido`);
    }

    // Validar números
    if (row.quantity && isNaN(parseFloat(row.quantity))) {
      errors.push(`Línea ${index + 2}: Cantidad debe ser un número`);
    }
    if (row.price && isNaN(parseFloat(row.price))) {
      errors.push(`Línea ${index + 2}: Precio debe ser un número`);
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

function groupOrdersByWeek(orders: OrderSellOut[], weeks: number): Array<{ week: string; sellOut: number; stock: number }> {
  // TODO: Implementar agrupación real por semana
  // Por ahora retornar datos mock
  return Array.from({ length: weeks }, (_, i) => ({
    week: `S${i + 1}`,
    sellOut: Math.random() * 5000 + 2000,
    stock: Math.random() * 10000 + 5000
  }));
}

function calculateCoverage(record: OnHand): number {
  // TODO: Implementar cálculo real de cobertura
  // Cobertura = días de stock disponible basado en consumo promedio
  return Math.floor(Math.random() * 30) + 10;
}

function calculateRotation(record: OnHand): number {
  // TODO: Implementar cálculo real de rotación
  // Rotación = días promedio que tarda en venderse el stock
  return Math.floor(Math.random() * 60) + 20;
}

function getStockStatus(record: OnHand): 'OK' | 'LOW' | 'CRITICAL' {
  const coverage = calculateCoverage(record);
  
  if (coverage < 7) return 'CRITICAL';
  if (coverage < 14) return 'LOW';
  return 'OK';
}

async function calculateBonus(distributorPartyId: string): Promise<number> {
  // TODO: Implementar lógica real de bonificaciones
  // Basado en objetivos, volumen, etc.
  return 850;
}
