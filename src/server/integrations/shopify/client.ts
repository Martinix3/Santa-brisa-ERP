/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/shopify/client.ts
import 'server-only';

import { BaseIntegration, type ApiResponse } from '../base-integration';
import type { OrderSellOut } from '@/domain/ssot';

export interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: 'pending' | 'authorized' | 'paid' | 'refunded';
  fulfillment_status: 'fulfilled' | 'partial' | 'null';
  line_items: ShopifyLineItem[];
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  shipping_address: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
}

export interface ShopifyLineItem {
  id: number;
  product_id: number;
  variant_id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  variants: Array<{
    id: number;
    sku: string;
    price: string;
    inventory_quantity: number;
  }>;
}

export class ShopifyClient extends BaseIntegration {
  private storeName: string;

  constructor() {
    const useReal = process.env.SHOPIFY_USE_REAL === 'true';
    const storeName = process.env.SHOPIFY_STORE_NAME || 'santabrisa';
    
    super({
      apiKey: process.env.SHOPIFY_ACCESS_TOKEN || 'mock',
      baseUrl: `https://${storeName}.myshopify.com/admin/api/2024-01`,
      useMock: !useReal
    });
    
    this.storeName = storeName;
  }

  getProviderName() {
    return 'shopify' as const;
  }

  // Override call to use Shopify-specific headers
  protected async call<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<ApiResponse<T>> {
    if (this.useMock) {
      return this.mockCall(endpoint, method, data);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'X-Shopify-Access-Token': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[ShopifyClient] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== ORDERS ====================

  async getOrders(params?: {
    limit?: number;
    status?: string;
    created_at_min?: string;
  }): Promise<ShopifyOrder[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.status) queryParams.set('status', params.status);
    if (params?.created_at_min) queryParams.set('created_at_min', params.created_at_min);

    const response = await this.call<{ orders: ShopifyOrder[] }>(
      `/orders.json?${queryParams.toString()}`,
      'GET'
    );

    return response.success && response.data ? response.data.orders : [];
  }

  async getOrder(orderId: number): Promise<ShopifyOrder | null> {
    const response = await this.call<{ order: ShopifyOrder }>(
      `/orders/${orderId}.json`,
      'GET'
    );

    return response.success && response.data ? response.data.order : null;
  }

  // Alias for backwards compatibility
  async getOrderById(orderId: number): Promise<ShopifyOrder | null> {
    return this.getOrder(orderId);
  }

  async fulfillOrder(orderId: number, locationId?: number): Promise<void> {
    await this.call(
      `/orders/${orderId}/fulfillments.json`,
      'POST',
      {
        fulfillment: {
          location_id: locationId || 1,
          notify_customer: true
        }
      }
    );
  }

  // ==================== PRODUCTS ====================

  async getProducts(params?: {
    limit?: number;
    ids?: number[];
  }): Promise<ShopifyProduct[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.ids) queryParams.set('ids', params.ids.join(','));

    const response = await this.call<{ products: ShopifyProduct[] }>(
      `/products.json?${queryParams.toString()}`,
      'GET'
    );

    return response.success && response.data ? response.data.products : [];
  }

  async updateInventory(variantId: number, quantity: number): Promise<void> {
    await this.call(
      `/inventory_levels/set.json`,
      'POST',
      {
        location_id: 1, // TODO: Make configurable
        inventory_item_id: variantId,
        available: quantity
      }
    );
  }

  // ==================== MOCK IMPLEMENTATION ====================

  protected async mockCall(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<ApiResponse<any>> {
    console.log('[Shopify MOCK]', method, endpoint, data);

    await this.wait(400);

    // GET /orders.json
    if (endpoint.includes('/orders.json') && method === 'GET') {
      return {
        success: true,
        data: {
          orders: [
            {
              id: Math.floor(Math.random() * 100000),
              order_number: Math.floor(Math.random() * 10000),
              email: 'customer@example.com',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              total_price: '45.50',
              subtotal_price: '37.50',
              total_tax: '8.00',
              currency: 'EUR',
              financial_status: 'paid' as const,
              fulfillment_status: 'null' as const,
              line_items: [
                {
                  id: 1,
                  product_id: 123,
                  variant_id: 456,
                  title: 'Santa Brisa Original',
                  quantity: 2,
                  price: '18.75',
                  sku: 'SB-ORIG-750'
                }
              ],
              customer: {
                id: 789,
                email: 'customer@example.com',
                first_name: 'Juan',
                last_name: 'Pérez'
              },
              shipping_address: {
                address1: 'Calle Mayor 123',
                city: 'Madrid',
                province: 'Madrid',
                zip: '28001',
                country: 'Spain'
              }
            }
          ]
        }
      };
    }

    // GET /orders/:id.json
    if (endpoint.match(/\/orders\/\d+\.json/) && method === 'GET') {
      const orderId = endpoint.match(/\/orders\/(\d+)\.json/)?.[1];
      return {
        success: true,
        data: {
          order: {
            id: parseInt(orderId || '1'),
            order_number: Math.floor(Math.random() * 10000),
            email: 'customer@example.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            total_price: '45.50',
            subtotal_price: '37.50',
            total_tax: '8.00',
            currency: 'EUR',
            financial_status: 'paid' as const,
            fulfillment_status: 'null' as const,
            line_items: [],
            customer: {
              id: 789,
              email: 'customer@example.com',
              first_name: 'Juan',
              last_name: 'Pérez'
            },
            shipping_address: {
              address1: 'Calle Mayor 123',
              city: 'Madrid',
              province: 'Madrid',
              zip: '28001',
              country: 'Spain'
            }
          }
        }
      };
    }

    // POST /orders/:id/fulfillments.json
    if (endpoint.includes('/fulfillments.json') && method === 'POST') {
      return {
        success: true,
        data: {
          fulfillment: {
            id: Math.floor(Math.random() * 100000),
            status: 'success'
          }
        }
      };
    }

    // GET /products.json
    if (endpoint.includes('/products.json') && method === 'GET') {
      return {
        success: true,
        data: {
          products: [
            {
              id: 123,
              title: 'Santa Brisa Original',
              variants: [
                {
                  id: 456,
                  sku: 'SB-ORIG-750',
                  price: '18.75',
                  inventory_quantity: 50
                }
              ]
            }
          ]
        }
      };
    }

    // POST /inventory_levels/set.json
    if (endpoint.includes('/inventory_levels/set.json') && method === 'POST') {
      return {
        success: true,
        data: {
          inventory_level: {
            available: data.available
          }
        }
      };
    }

    return { success: true, data: { ok: true } };
  }
}
