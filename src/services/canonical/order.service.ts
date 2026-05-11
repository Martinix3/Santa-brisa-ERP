/**
 * SSOT V2.1: Order Service
 * 
 * Canonical service for OrderSellOut operations with extended customer & commercial data.
 * Provides methods for creating, validating, enriching, and querying orders.
 * 
 * @module services/canonical/order
 */

import { adminDb } from '@/server/firebase';
import type { OrderSellOut, Contact, Party, Address } from '@/domain/ssot';
import { 
  OrderSellOutSchema, 
  OrderSellOutRules,
  populateOrderCustomerData,
  inferChannelFromSegment,
  calculateOrderTotal
} from '@/domain/ssot-v2-plus-schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateOrderInput {
  // Core order data
  orderNumber: string;
  orderDate: string; // ISO date string
  lines: Array<{
    itemId: string;
    name?: string;
    qty: number;
    uom: 'unit' | 'bottle' | 'case' | 'pallet';
    priceUnit: number;
    discountPct?: number;
  }>;
  
  // Customer reference (required)
  contactId?: string;
  distributorPartyId?: string;
  accountId?: string;
  
  // Optional overrides
  channel?: OrderSellOut['channel'];
  ownerId?: string;
  ownerName?: string;
  
  // Flow control
  flow?: OrderSellOut['flow'];
  status?: OrderSellOut['status'];
  
  // Additional data
  notes?: string;
  internalNotes?: string;
}

export interface EnrichOrderInput {
  orderId: string;
  contactId?: string;
  distributorPartyId?: string;
  forceRefresh?: boolean;
}

export interface OrderQueryOptions {
  channel?: OrderSellOut['channel'];
  ownerId?: string;
  status?: OrderSellOut['status'];
  flow?: OrderSellOut['flow'];
  dateFrom?: string; // ISO date string
  dateTo?: string;   // ISO date string
  limit?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class OrderService {
  private readonly ordersCollection = 'ordersSellOut';
  private readonly contactsCollection = 'contacts';
  private readonly partiesCollection = 'parties';

  /**
   * Creates a new order with auto-populated customer data
   */
  async createOrder(input: CreateOrderInput): Promise<OrderSellOut> {
    // Step 1: Fetch customer data if references provided
    let contact: Contact | null = null;
    let party: Party | null = null;

    if (input.contactId) {
      contact = await this.getContact(input.contactId);
    }
    if (input.distributorPartyId) {
      party = await this.getParty(input.distributorPartyId);
    }

    // Step 2: Build base order
    const now = new Date().toISOString();
    const orderTotal = calculateOrderTotal(input.lines);

    const order: Partial<OrderSellOut> = {
      docNumber: input.orderNumber,
      orderDate: input.orderDate,
      lines: input.lines,
      totalAmount: orderTotal,
      currency: 'EUR',
      flow: input.flow ?? 'DIRECT',
      status: input.status ?? 'open',
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      accountId: input.accountId || '', // Prefer explicit accountId when provided
    };

    // Step 3: Populate customer data from Contact/Party
    const enrichedOrder = populateOrderCustomerData(order, contact, party);

    // Step 4: Apply overrides if provided
    if (input.channel) {
      enrichedOrder.channel = input.channel;
    }

    if (input.ownerId) {
      enrichedOrder.ownerId = input.ownerId;
    }
    if (input.ownerName) {
      enrichedOrder.ownerName = input.ownerName;
    }

    // Step 5: Validate the complete order
    const validation = await this.validateOrder(enrichedOrder);
    if (!validation.valid) {
      throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
    }

    // Step 6: Save to Firestore
    const docRef = await adminDb.collection(this.ordersCollection).add(enrichedOrder);
    
    // Promote account stage to ACTIVA when an order is created
    try {
      const accountId = enrichedOrder.accountId;
      if (accountId) {
        const accountRef = adminDb.collection('accounts').doc(accountId);
        const snap = await accountRef.get();
        if (snap.exists) {
          const acc = snap.data() as any;
          const current = (acc?.stage as string) || 'POTENCIAL';
          const rank: Record<string, number> = { POTENCIAL: 1, SEGUIMIENTO: 2, ACTIVA: 3, FALLIDA: 0, CERRADA: 0, BAJA: 0 };
          const nowIso = new Date().toISOString();
          if ((rank[current] ?? 0) < rank['ACTIVA']) {
            await accountRef.update({ stage: 'ACTIVA', updatedAt: nowIso, lastInteractionAt: nowIso });
          } else {
            await accountRef.update({ lastInteractionAt: nowIso, updatedAt: nowIso });
          }
        }
      }
    } catch (e) {
      console.error('[OrderService.createOrder] Failed to escalate account stage:', e);
    }
    const savedOrder = {
      ...enrichedOrder,
      id: docRef.id,
    } as OrderSellOut;

    return savedOrder;
  }

  /**
   * Validates an order against business rules
   * Note: We validate business rules only, not Zod schema, since SSOT types differ from V2+ schemas
   */
  async validateOrder(order: Partial<OrderSellOut>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic required fields validation
    if (!order.accountId) {
      errors.push('accountId is required');
    }
    if (!order.lines || order.lines.length === 0) {
      errors.push('At least one order line is required');
    }
    if (!order.status) {
      errors.push('status is required');
    }
    if (!order.currency) {
      errors.push('currency is required');
    }

    // Business rules validation
    const rulesResult = OrderSellOutRules.validateAll(order as OrderSellOut);
    errors.push(...rulesResult.errors);
    warnings.push(...rulesResult.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Enriches an existing order with customer data from Contact/Party
   */
  async enrichOrder(input: EnrichOrderInput): Promise<OrderSellOut> {
    // Step 1: Fetch existing order
    const orderDoc = await adminDb.collection(this.ordersCollection).doc(input.orderId).get();
    if (!orderDoc.exists) {
      throw new Error(`Order ${input.orderId} not found`);
    }

    const order = { id: orderDoc.id, ...orderDoc.data() } as OrderSellOut;

    // Step 2: Check if enrichment needed
    if (!input.forceRefresh && this.isOrderEnriched(order)) {
      return order; // Already enriched
    }

    // Step 3: Fetch customer data
    const contactId = input.contactId;
    const distributorPartyId = input.distributorPartyId ?? order.distributorPartyId;

    let contact: Contact | null = null;
    let party: Party | null = null;

    if (contactId) {
      contact = await this.getContact(contactId);
    }
    if (distributorPartyId) {
      party = await this.getParty(distributorPartyId);
    }

    // Step 4: Populate customer data
    const enrichedOrder = populateOrderCustomerData(order, contact, party);
    enrichedOrder.updatedAt = new Date().toISOString();

    // Step 5: Validate and save
    const validation = await this.validateOrder(enrichedOrder);
    if (!validation.valid) {
      throw new Error(`Order enrichment validation failed: ${validation.errors.join(', ')}`);
    }

    await adminDb.collection(this.ordersCollection).doc(input.orderId).update(enrichedOrder);

    return { ...enrichedOrder, id: input.orderId } as OrderSellOut;
  }

  /**
   * Queries orders with filters
   */
  async queryOrders(options: OrderQueryOptions = {}): Promise<OrderSellOut[]> {
    let query = adminDb.collection(this.ordersCollection) as any;

    // Apply filters
    if (options.channel) {
      query = query.where('channel', '==', options.channel);
    }
    if (options.ownerId) {
      query = query.where('ownerId', '==', options.ownerId);
    }
    if (options.status) {
      query = query.where('status', '==', options.status);
    }
    if (options.flow) {
      query = query.where('flow', '==', options.flow);
    }
    if (options.dateFrom) {
      query = query.where('orderDate', '>=', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.where('orderDate', '<=', options.dateTo);
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Execute query
    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as OrderSellOut[];
  }

  /**
   * Gets orders by owner (commercial responsible)
   */
  async getOrdersByOwner(ownerId: string, limit = 100): Promise<OrderSellOut[]> {
    return this.queryOrders({ ownerId, limit });
  }

  /**
   * Gets orders by channel
   */
  async getOrdersByChannel(channel: OrderSellOut['channel'], limit = 100): Promise<OrderSellOut[]> {
    return this.queryOrders({ channel, limit });
  }

  /**
   * Updates order owner (commercial responsible)
   */
  async updateOrderOwner(orderId: string, ownerId: string, ownerName: string): Promise<void> {
    await adminDb.collection(this.ordersCollection).doc(orderId).update({
      ownerId,
      ownerName,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Updates order channel
   */
  async updateOrderChannel(orderId: string, channel: OrderSellOut['channel']): Promise<void> {
    // Validate channel
    const validChannels: OrderSellOut['channel'][] = ['PRIVATE', 'DISTRIBUTOR', 'ONLINE', 'HORECA', 'CATERING'];
    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}`);
    }

    await adminDb.collection(this.ordersCollection).doc(orderId).update({
      channel,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Updates order status with transition validation
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderSellOut['status'],
    userId?: string
  ): Promise<void> {
    // Get current order
    const orderDoc = await adminDb.collection(this.ordersCollection).doc(orderId).get();
    if (!orderDoc.exists) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = { id: orderDoc.id, ...orderDoc.data() } as OrderSellOut;
    
    // Validate transition
    if (!this.isValidStatusTransition(order.status, newStatus)) {
      throw new Error(`Invalid status transition: ${order.status} → ${newStatus}`);
    }

    // Update status
    await adminDb.collection(this.ordersCollection).doc(orderId).update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    await this.createAuditLog({
      orderId,
      action: 'STATUS_CHANGED',
      from: order.status,
      to: newStatus,
      userId: userId || 'system',
      timestamp: new Date().toISOString(),
    });

    // Resolve related alerts when status changes
    await this.resolveOrderAlerts(orderId, userId || 'system');
  }

  /**
   * Resolves alerts for an order (called after status change)
   */
  private async resolveOrderAlerts(orderId: string, userId: string): Promise<void> {
    try {
      const snapshot = await adminDb.collection('alerts')
        .where('entityType', '==', 'ORDER')
        .where('entityId', '==', orderId)
        .where('status', '==', 'ACTIVE')
        .get();

      if (snapshot.empty) return;

      const batch = adminDb.batch();
      const now = new Date().toISOString();

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'RESOLVED',
          resolvedAt: now,
          resolvedBy: userId,
          updatedAt: now,
        });
      });

      await batch.commit();
      console.log(`[OrderService] Resolved ${snapshot.size} alerts for order ${orderId}`);
    } catch (error) {
      console.error('[OrderService] Error resolving alerts:', error);
    }
  }

  /**
   * Validates status transition
   */
  private isValidStatusTransition(
    from: OrderSellOut['status'],
    to: OrderSellOut['status']
  ): boolean {
    const validTransitions: Record<string, OrderSellOut['status'][]> = {
      open: ['confirmed', 'cancelled', 'lost'],
      confirmed: ['shipped', 'cancelled'],
      shipped: ['invoiced', 'cancelled'],
      invoiced: ['paid'],
      paid: [],
      cancelled: [],
      lost: [],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Generates unique document number
   */
  async generateDocNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PED-${year}`;
    
    // Get last order number for this year
    const lastOrderSnap = await adminDb
      .collection(this.ordersCollection)
      .where('docNumber', '>=', prefix)
      .where('docNumber', '<', `PED-${year + 1}`)
      .orderBy('docNumber', 'desc')
      .limit(1)
      .get();

    let nextNumber = 1;
    if (!lastOrderSnap.empty) {
      const lastDocNumber = lastOrderSnap.docs[0].data().docNumber;
      if (lastDocNumber) {
        const parts = lastDocNumber.split('-');
        if (parts.length === 3) {
          const lastNumber = parseInt(parts[2]);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }
    }

    return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Creates audit log entry
   */
  private async createAuditLog(log: {
    orderId: string;
    action: string;
    from?: OrderSellOut['status'];
    to?: OrderSellOut['status'];
    userId: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await adminDb.collection('auditLogs').add({
      entity: 'ORDER',
      entityId: log.orderId,
      action: log.action,
      from: log.from,
      to: log.to,
      userId: log.userId,
      timestamp: log.timestamp,
      metadata: log.metadata,
    });
  }

  /**
   * Gets orders by account
   */
  async getOrdersByAccount(accountId: string, limit = 50): Promise<OrderSellOut[]> {
    const snapshot = await adminDb
      .collection(this.ordersCollection)
      .where('accountId', '==', accountId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as OrderSellOut[];
  }

  /**
   * Gets orders by date range
   */
  async getOrdersByDateRange(
    startDate: string,
    endDate: string
  ): Promise<OrderSellOut[]> {
    const snapshot = await adminDb
      .collection(this.ordersCollection)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as OrderSellOut[];
  }

  /**
   * Gets orders by status
   */
  async getOrdersByStatus(status: OrderSellOut['status']): Promise<OrderSellOut[]> {
    const snapshot = await adminDb
      .collection(this.ordersCollection)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as OrderSellOut[];
  }

  /**
   * Bulk enrichment: enriches all orders missing V2.1 fields
   */
  async bulkEnrichOrders(batchSize = 50): Promise<{ processed: number; enriched: number; errors: number }> {
    let processed = 0;
    let enriched = 0;
    let errors = 0;

    // Query orders missing V2.1 fields
    const snapshot = await adminDb.collection(this.ordersCollection)
      .where('channel', '==', null)
      .limit(batchSize)
      .get();

    for (const doc of snapshot.docs) {
      try {
        const order = { id: doc.id, ...doc.data() } as OrderSellOut;
        
        if (!this.isOrderEnriched(order)) {
          await this.enrichOrder({ orderId: doc.id });
          enriched++;
        }
        
        processed++;
      } catch (error) {
        console.error(`Error enriching order ${doc.id}:`, error);
        errors++;
      }
    }

    return { processed, enriched, errors };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async getContact(contactId: string): Promise<Contact | null> {
    const doc = await adminDb.collection(this.contactsCollection).doc(contactId).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Contact) : null;
  }

  private async getParty(partyId: string): Promise<Party | null> {
    const doc = await adminDb.collection(this.partiesCollection).doc(partyId).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Party) : null;
  }

  private isOrderEnriched(order: OrderSellOut): boolean {
    // Check if order has V2.1 fields populated
    return !!(
      order.channel &&
      order.customerVat &&
      order.customerName &&
      order.billingAddress
    );
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const orderService = new OrderService();
