// tests/server-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateShipment } from '@/app/(app)/warehouse/logistics/actions';
import { createSalesInvoice } from '@/app/(app)/orders/actions';
import type { Shipment, OrderSellOut, FinanceLink, SantaData } from '@/domain/ssot';

// Mock del data provider del servidor
vi.mock('@/lib/dataprovider/server', () => ({
  getServerData: vi.fn(),
}));

vi.mock('@/lib/dataprovider/actions', () => ({
  upsertMany: vi.fn(),
}));

// Mock de next/cache que no hace nada en el entorno de test
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Importar los mocks para poder espiarlos
const getServerDataMock = (await import('@/lib/dataprovider/server')).getServerData as any;
const upsertManyMock = (await import('@/lib/dataprovider/actions')).upsertMany as any;

describe('Server Actions', () => {

  beforeEach(() => {
    // Limpia los mocks antes de cada test
    vi.clearAllMocks();
  });

  describe('validateShipment', () => {
    it('debe cambiar el estado del envío a "ready_to_ship" y el del pedido a "confirmed"', async () => {
      const MOCK_SHIPMENT_ID = 'shp_test_1';
      const MOCK_ORDER_ID = 'ord_test_1';
      const MOCK_USER_ID = 'user_test_1';

      const mockShipment: Partial<Shipment> = {
        id: MOCK_SHIPMENT_ID,
        orderId: MOCK_ORDER_ID,
        status: 'pending',
        lines: [{ sku: 'SKU1', qty: 1, name: 'Test Product', uom: 'uds' }],
      };

      // Simular que getServerData devuelve nuestro envío de prueba
      getServerDataMock.mockResolvedValue({ shipments: [mockShipment] } as Partial<SantaData>);
      upsertManyMock.mockResolvedValue({ inserted: 0, updated: 1, ids: [] });

      await validateShipment({
        shipmentId: MOCK_SHIPMENT_ID,
        userId: MOCK_USER_ID,
      });

      // 1. Comprobar que se llamó a upsertMany para 'shipments' con los datos correctos
      expect(upsertManyMock).toHaveBeenCalledWith('shipments', expect.arrayContaining([
        expect.objectContaining({
          id: MOCK_SHIPMENT_ID,
          status: 'ready_to_ship',
          // validatedById: MOCK_USER_ID, // Asumiendo que el campo existe en el SSOT
        })
      ]));

      // 2. Comprobar que se llamó a upsertMany para 'ordersSellOut' con los datos correctos
      expect(upsertManyMock).toHaveBeenCalledWith('ordersSellOut', expect.arrayContaining([
        expect.objectContaining({
          id: MOCK_ORDER_ID,
          status: 'confirmed',
        })
      ]));

      // 3. Verificar que se llamó 2 veces a upsertMany en total
      expect(upsertManyMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('createSalesInvoice', () => {
    it('debe crear un FinanceLink y actualizar el estado del pedido a "invoiced"', async () => {
      const MOCK_ORDER_ID = 'ord_invoice_test_1';
      const MOCK_PARTY_ID = 'party_test_1';

      const mockOrder: Partial<OrderSellOut> = {
        id: MOCK_ORDER_ID,
        partyId: MOCK_PARTY_ID,
        status: 'shipped',
        lines: [{ sku: 'SKU1', qty: 2, priceUnit: 10, uom: 'uds' }],
        currency: 'EUR',
      };

      getServerDataMock.mockResolvedValue({ ordersSellOut: [mockOrder] });
      upsertManyMock.mockResolvedValue({ inserted: 1, updated: 0, ids: [] });

      const result = await createSalesInvoice({ orderId: MOCK_ORDER_ID });

      // 1. Comprobar que se llamó a upsertMany para 'financeLinks'
      expect(upsertManyMock).toHaveBeenCalledWith('financeLinks', expect.arrayContaining([
        expect.objectContaining({
          docType: 'SALES_INVOICE',
          grossAmount: 20, // 2 * 10
          partyId: MOCK_PARTY_ID,
          costObject: { kind: 'ORDER', id: MOCK_ORDER_ID },
        })
      ]));

      // 2. Comprobar que se actualizó el pedido
      expect(upsertManyMock).toHaveBeenCalledWith('ordersSellOut', expect.arrayContaining([
        expect.objectContaining({
          id: MOCK_ORDER_ID,
          status: 'invoiced',
          billingStatus: 'INVOICED',
        })
      ]));

      // 3. Verificar que se llamó 2 veces y se devolvió el ID del link
      expect(upsertManyMock).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      expect(result.financeLinkId).toBeDefined();
    });
  });
});
