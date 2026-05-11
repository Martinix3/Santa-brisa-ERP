/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/holded/client.ts
import 'server-only';

import { BaseIntegration, type ApiResponse } from '../base-integration';
import type { Shipment } from '@/domain/ssot';

export interface HoldedInvoice {
  id: string;
  docNumber: string;
  status: 'pending' | 'paid' | 'cancelled';
  total: number;
}

export interface HoldedInvoiceItem {
  name: string;
  units: number;
  price: number;
  tax: number;
}

export class HoldedClient extends BaseIntegration {
  
  protected getProviderName(): 'holded' {
    return 'holded';
  }

  constructor() {
    // Por defecto usar MOCK a menos que explícitamente se configure HOLDED_USE_REAL=true
    const useReal = process.env.HOLDED_USE_REAL === 'true';
    const useMock = !useReal;
    
    console.log('[HoldedClient] Initializing in', useMock ? 'MOCK' : 'REAL', 'mode');
    
    super({
      apiKey: process.env.HOLDED_API_KEY || 'mock',
      baseUrl: 'https://api.holded.com/api/invoicing/v1',
      useMock
    });
  }

  async getContacts(): Promise<any[]> {
    let allContacts: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 10) { // Max 10 páginas de seguridad
      const response = await this.call<any>(
        `/contacts?page=${page}`,
        'GET'
      );
      
      if (response.success && response.data) {
        // Holded puede retornar array directo o objeto con data
        const contacts = Array.isArray(response.data) ? response.data : response.data.data || [];
        
        if (contacts.length > 0) {
          allContacts = [...allContacts, ...contacts];
          page++;
          hasMore = contacts.length === 50; // Si trae 50, probablemente hay más
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    return allContacts;
  }

  async getContactById(contactId: string): Promise<any | null> {
    const response = await this.call<any>(
      `/contacts/${encodeURIComponent(contactId)}`,
      'GET'
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  }

  async getDocuments(type: 'salesorder' | 'estimate' = 'salesorder'): Promise<any[]> {
    let allDocuments: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 10) { // Max 10 páginas de seguridad
      const response = await this.call<any>(
        `/documents/${type}?page=${page}`,
        'GET'
      );
      
      if (response.success && response.data) {
        const documents = Array.isArray(response.data) ? response.data : response.data.data || [];
        
        if (documents.length > 0) {
          allDocuments = [...allDocuments, ...documents];
          page++;
          hasMore = documents.length === 50;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    return allDocuments;
  }

  async getInvoices(): Promise<any[]> {
    let allInvoices: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 10) {
      const response = await this.call<any>(
        `/documents/invoice?page=${page}`,
        'GET'
      );
      
      if (response.success && response.data) {
        const invoices = Array.isArray(response.data) ? response.data : response.data.data || [];
        
        if (invoices.length > 0) {
          allInvoices = [...allInvoices, ...invoices];
          page++;
          hasMore = invoices.length === 50;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    return allInvoices;
  }

  async createInvoice(shipment: Shipment, contactId?: string): Promise<HoldedInvoice> {
    const response = await this.call<HoldedInvoice>(
      '/documents',
      'POST',
      {
        type: 'invoice',
        contactId: contactId || 'MOCK_CONTACT',
        date: new Date().toISOString(),
        items: (shipment.lines || []).map(line => ({
          name: line.name || line.sku || 'Producto',
          units: line.qty,
          price: (line as any).priceUnit || 0,
          tax: 21 // IVA 21%
        } as HoldedInvoiceItem))
      }
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to create invoice in Holded');
    }

    return response.data;
  }

  async markInvoiceAsPaid(invoiceId: string, amount?: number): Promise<void> {
    await this.call(
      `/documents/${invoiceId}/payments`,
      'POST',
      {
        date: new Date().toISOString(),
        amount: amount || 'total',
        paymentMethod: 'transfer'
      }
    );
  }

  async getInvoice(invoiceId: string): Promise<HoldedInvoice | null> {
    const response = await this.call<HoldedInvoice>(
      `/documents/${invoiceId}`,
      'GET'
    );

    return response.success ? response.data || null : null;
  }

  protected async mockCall(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<ApiResponse<any>> {
    console.log('[Holded MOCK]', method, endpoint, data);

    // Simulate network latency
    await this.wait(300);

    // Mock documents endpoint (salesorders/estimates)
    if (endpoint.includes('/documents/salesorder') && method === 'GET') {
      return {
        success: true,
        data: [
          {
            id: 'MOCK-ORDER-1',
            docNumber: 'PED-2024-001',
            contactId: 'MOCK-CONTACT-1',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'sent',
            total: 1250.50,
            currency: 'EUR',
            lines: [
              { name: 'Vino Tinto Reserva', units: 12, price: 85, tax: 21 },
              { name: 'Vino Blanco', units: 6, price: 45, tax: 21 }
            ],
            notes: 'Entrega urgente',
            updatedAt: Math.floor(Date.now() / 1000) - 86400,
            createdAt: Math.floor(Date.now() / 1000) - 604800
          },
          {
            id: 'MOCK-ORDER-2',
            docNumber: 'PED-2024-002',
            contactId: 'MOCK-CONTACT-2',
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'accepted',
            total: 850.75,
            currency: 'EUR',
            lines: [
              { name: 'Vino Rosado', units: 18, price: 38, tax: 21 }
            ],
            notes: '',
            updatedAt: Math.floor(Date.now() / 1000) - 172800,
            createdAt: Math.floor(Date.now() / 1000) - 259200
          },
          {
            id: 'MOCK-ORDER-3',
            docNumber: 'PED-2024-003',
            contactId: 'MOCK-CONTACT-3',
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'draft',
            total: 456.00,
            currency: 'EUR',
            lines: [
              { name: 'Vino Blanco Premium', units: 8, price: 52, tax: 21 }
            ],
            notes: 'Pendiente confirmación',
            updatedAt: Math.floor(Date.now() / 1000) - 43200,
            createdAt: Math.floor(Date.now() / 1000) - 86400
          }
        ]
      };
    }

    // Mock contacts endpoint
    if (endpoint.includes('/contacts') && method === 'GET') {
      return {
        success: true,
        data: [
          {
            id: 'MOCK-CONTACT-1',
            name: 'Bar Los Arcos',
            code: 'C001',
            email: 'info@losarcos.es',
            phone: '912345678',
            mobile: '666123456',
            vatNumber: 'B12345678',
            address: 'Calle Mayor 10',
            city: 'Madrid',
            postalCode: '28001',
            province: 'Madrid',
            country: 'España',
            notes: 'Cliente habitual',
            tags: ['HORECA', 'VIP'],
            type: 1,
            updatedAt: Math.floor(Date.now() / 1000) - 86400,
            createdAt: Math.floor(Date.now() / 1000) - 2592000
          },
          {
            id: 'MOCK-CONTACT-2',
            name: 'Restaurante El Faro',
            code: 'C002',
            email: 'pedidos@elfaro.com',
            phone: '913456789',
            mobile: '677234567',
            vatNumber: 'B87654321',
            address: 'Avenida del Puerto 25',
            city: 'Valencia',
            postalCode: '46001',
            province: 'Valencia',
            country: 'España',
            notes: '',
            tags: ['HORECA'],
            type: 1,
            updatedAt: Math.floor(Date.now() / 1000) - 172800,
            createdAt: Math.floor(Date.now() / 1000) - 5184000
          },
          {
            id: 'MOCK-CONTACT-3',
            name: 'Cafetería Central',
            code: 'C003',
            email: 'central@cafeteria.es',
            phone: '954123456',
            mobile: '688345678',
            vatNumber: 'B11223344',
            address: 'Plaza del Sol 5',
            city: 'Sevilla',
            postalCode: '41001',
            province: 'Sevilla',
            country: 'España',
            notes: 'Pago al contado',
            tags: ['HORECA', 'NUEVO'],
            type: 1,
            updatedAt: Math.floor(Date.now() / 1000) - 43200,
            createdAt: Math.floor(Date.now() / 1000) - 1296000
          }
        ]
      };
    }

    if (endpoint.includes('/documents') && method === 'POST') {
      const total = (data.items || []).reduce(
        (sum: number, item: HoldedInvoiceItem) => sum + item.units * item.price * (1 + item.tax / 100),
        0
      );

      return {
        success: true,
        data: {
          id: `MOCK-INV-${Date.now()}`,
          docNumber: `FAC-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          status: 'pending' as const,
          total: Math.round(total * 100) / 100
        }
      };
    }

    if (endpoint.includes('/payments') && method === 'POST') {
      return {
        success: true,
        data: {
          id: `MOCK-PAY-${Date.now()}`,
          status: 'completed'
        }
      };
    }

    if (endpoint.includes('/documents/') && method === 'GET') {
      const invoiceId = endpoint.split('/documents/')[1].split('/')[0];
      return {
        success: true,
        data: {
          id: invoiceId,
          docNumber: `FAC-${Math.floor(Math.random() * 10000)}`,
          status: 'pending' as const,
          total: 1000
        }
      };
    }

    return { success: true, data: { ok: true } };
  }
}
