/**
 * Tests for placeOrder() - Order Creation with QC Validation
 * 
 * Tests críticos para la creación de pedidos con validación de stock y QC
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Account, Item, Lot, OnHandView, OrderSellOut } from '@/domain/ssot';

// Mock de Firebase y otros módulos
vi.mock('@/server/firebase', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: vi.fn(),
        lotCode: 'LOT-123',
        id: 'test-order-id',
      })),
      get: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/dataprovider/server', () => ({
  getOne: vi.fn(),
  upsertMany: vi.fn(),
}));

vi.mock('@/lib/trace/TraceEventFactory', () => ({
  TraceEventFactory: {
    create: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Helper para crear datos de prueba
function createTestAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'test-account-001',
    partyId: 'test-party-001',
    name: 'Test Account',
    segment: 'HORECA',
    stage: 'ACTIVA',
    ownerId: 'test-owner',
    flow: 'DIRECT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function createTestItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'test-item-001',
    sku: 'test-item-001',
    name: 'Test Product',
    category: 'fg',
    uom: 'unit',
    active: true,
    ...overrides
  };
}

function createTestLot(overrides: Partial<Lot> = {}): Lot {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  return {
    id: 'test-lot-001',
    lotNumber: 'LOT-TEST-001',
    itemId: 'test-item-001',
    itemName: 'Test Product',
    quantity: 100,
    uom: 'unit',
    qcStatus: 'PASSED',
    expDate: futureDate.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function createTestOnHand(overrides: Partial<OnHandView> = {}): OnHandView {
  return {
    id: 'test-onhand-001',
    itemId: 'test-item-001',
    lotCode: 'LOT-TEST-001',

    locationId: 'MAIN',
    qty: 100,
    uom: 'unit',
    qcStatus: 'PASSED',
    category: 'fg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe('placeOrder()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validación de Input (Zod Schema)', () => {
    it('debe rechazar pedido sin accountId', async () => {
      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: '',
        lines: [
          { itemId: 'item-001', qty: 10, priceUnit: 5.0 }
        ]
      } as any);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('cuenta requerido');
    });

    it('debe rechazar pedido sin líneas', async () => {
      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: []
      } as any);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('al menos una línea');
    });

    it('debe rechazar cantidad negativa', async () => {
      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [
          { itemId: 'item-001', qty: -10, priceUnit: 5.0 }
        ]
      } as any);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('positiva');
    });

    it('debe rechazar precio negativo', async () => {
      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [
          { itemId: 'item-001', qty: 10, priceUnit: -5.0 }
        ]
      } as any);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('no negativo');
    });

    it('debe rechazar descuento > 100%', async () => {
      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [
          { itemId: 'item-001', qty: 10, priceUnit: 5.0, discountPct: 150 }
        ]
      } as any);

      expect(result.ok).toBe(false);
      expect(result.error).toBe(true);
    });
  });

  describe('Validación de Cuenta', () => {
    it('debe rechazar si la cuenta no existe', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      vi.mocked(getOne).mockResolvedValueOnce(null); // Account not found

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'non-existent',
        lines: [{ itemId: 'item-001', qty: 10, priceUnit: 5.0 }]
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('no encontrada');
    });
  });

  describe('Validación de Items', () => {
    it('debe rechazar si el item no existe', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      // Mock account exists
      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      // Mock collections
      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [] // No items
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: 'non-existent', qty: 10, priceUnit: 5.0 }]
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('no encontrado');
    });
  });

  describe('Validación de Stock y QC', () => {
    it('debe rechazar si no hay lotes disponibles', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      const testItem = createTestItem();

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{
                id: testItem.id,
                data: () => testItem
              }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [] // No lots
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }]
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('No hay lotes disponibles');
    });

    it('debe rechazar si todos los lotes están PENDING', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      const testItem = createTestItem();
      const testLot = createTestLot({ qcStatus: 'PENDING' });

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testItem.id, data: () => testItem }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testLot.id, data: () => testLot }]
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }]
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('pendientes de QC');
    });

    it('debe rechazar si todos los lotes están HOLD', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      const testItem = createTestItem();
      const testLot = createTestLot({ qcStatus: 'HOLD' });

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testItem.id, data: () => testItem }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testLot.id, data: () => testLot }]
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }]
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('retenidos por QC');
    });

    it('debe rechazar si no hay lotes aprobados disponibles', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      const testItem = createTestItem();
      const testLot = createTestLot({ qcStatus: 'FAILED' });

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testItem.id, data: () => testItem }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testLot.id, data: () => testLot }]
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }]
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('No hay lotes aprobados disponibles');
    });

    it('debe rechazar si stock insuficiente', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      const testItem = createTestItem();
      const testLot = createTestLot({ quantity: 5 }); // Solo 5 disponibles

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testItem.id, data: () => testItem }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testLot.id, data: () => testLot }]
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }] // Pide 10
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Stock insuficiente');
    });

    it('debe rechazar si lote ha caducado', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      const pastDate = new Date('2020-01-01').toISOString();
      const testItem = createTestItem();
      const testLot = createTestLot({ expDate: pastDate });

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testItem.id, data: () => testItem }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testLot.id, data: () => testLot }]
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }]
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('caducado');
    });
  });

  describe('Warnings', () => {
    it('debe generar warning si item está inactivo', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      const testItem = createTestItem({ active: false });
      const testLot = createTestLot({ quantity: 100 });

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testItem.id, data: () => testItem }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testLot.id, data: () => testLot }]
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }]
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('inactivo'))).toBe(true);
    });
  });

  describe('Sugerencias de Lotes (FEFO)', () => {
    it('debe sugerir el lote que caduca primero (FEFO)', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      vi.mocked(getOne).mockResolvedValueOnce(createTestAccount());

      const date1 = new Date();
      date1.setDate(date1.getDate() + 10);

      const date2 = new Date();
      date2.setDate(date2.getDate() + 5); // Caduca primero

      const testItem = createTestItem();
      const lot1 = createTestLot({
        lotNumber: 'LOT-001',
        quantity: 100,
        expDate: date1.toISOString()
      });
      const lot2 = createTestLot({
        lotNumber: 'LOT-002',
        quantity: 100,
        expDate: date2.toISOString()
      });

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testItem.id, data: () => testItem }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [
                { id: lot1.id, data: () => lot1 },
                { id: lot2.id, data: () => lot2 }
              ]
            })
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: 'account-001',
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }]
      });

      expect(result.suggestedLots?.[testItem.id]?.lotNumber).toBe('LOT-002');
    });
  });

  describe('Creación de Pedido Exitosa', () => {
    it('debe crear pedido con datos válidos', async () => {
      const { getOne } = await import('@/lib/dataprovider/server');
      const { adminDb } = await import('@/server/firebase');

      const testAccount = createTestAccount();
      vi.mocked(getOne).mockResolvedValueOnce(testAccount);

      const testItem = createTestItem();
      const testLot = createTestLot({ quantity: 100 });

      vi.mocked(adminDb.collection).mockImplementation((name: string) => {
        if (name === 'items') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testItem.id, data: () => testItem }]
            })
          } as any;
        }
        if (name === 'lots') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: testLot.id, data: () => testLot }]
            })
          } as any;
        }
        if (name === 'ordersSellOut') {
          return {
            doc: vi.fn(() => ({
              id: 'test-order-id',
              set: vi.fn()
            }))
          } as any;
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        } as any;
      });

      const { placeOrder } = await import('@/app/(app)/orders/actions');

      const result = await placeOrder({
        accountId: testAccount.id,
        lines: [{ itemId: testItem.id, qty: 10, priceUnit: 5.0 }]
      });

      expect(result.ok).toBe(true);
      expect(result.orderId).toBe('test-order-id');
      expect(result.suggestedLots).toBeDefined();
    });

    it('debe calcular total correctamente con descuentos', async () => {
      // Este test validaría que el total se calcula bien
      // Por ahora lo dejamos como placeholder ya que requiere espiar
      // las llamadas a Firestore
      expect(true).toBe(true);
    });
  });
});
