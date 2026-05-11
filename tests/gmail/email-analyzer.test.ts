// tests/gmail/email-analyzer.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeEmailWithGemini } from '@/server/gemini/analyzers/email-analyzer';
import type { ParsedEmail } from '@/server/integrations/gmail/types';

describe('Email Analyzer', () => {
  
  describe('Clasificación por Departamento', () => {
    
    it('debe clasificar email de ventas', async () => {
      const email: ParsedEmail = {
        messageId: 'test_1',
        threadId: 'thread_1',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Consulta sobre precios y catálogo',
        body: 'Hola, me interesa comprar productos. ¿Pueden enviarme una cotización?',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.department).toBe('VENTAS');
      expect(result.priority).toBe('medium');
      expect(result.requiresAction).toBe(true);
    });
    
    it('debe clasificar email de almacén', async () => {
      const email: ParsedEmail = {
        messageId: 'test_2',
        threadId: 'thread_2',
        from: 'cliente@example.com',
        to: ['almacen@santabrisa.com'],
        subject: 'Consulta sobre envío',
        body: '¿Cuál es el tracking del pedido #1234? ¿Cuándo llega?',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.department).toBe('ALMACEN');
      expect(result.relatedEntities.orders).toContain('#1234');
    });
    
    it('debe clasificar email de calidad', async () => {
      const email: ParsedEmail = {
        messageId: 'test_3',
        threadId: 'thread_3',
        from: 'cliente@example.com',
        to: ['calidad@santabrisa.com'],
        subject: 'Certificado de análisis',
        body: 'Necesito el certificado del lote L-2025-001 y la ficha técnica',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.department).toBe('CALIDAD');
    });
    
    it('debe clasificar email de finanzas', async () => {
      const email: ParsedEmail = {
        messageId: 'test_4',
        threadId: 'thread_4',
        from: 'cliente@example.com',
        to: ['finanzas@santabrisa.com'],
        subject: 'Consulta sobre factura',
        body: '¿Cuándo procesarán el pago de la factura FAC-1234?',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.department).toBe('FINANZAS');
      expect(result.relatedEntities.invoices).toBeDefined();
    });
  });
  
  describe('Detección de Prioridad', () => {
    
    it('debe detectar prioridad URGENT', async () => {
      const email: ParsedEmail = {
        messageId: 'test_urgent',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'URGENTE: Necesito respuesta YA',
        body: 'Es urgente, necesito la cotización ASAP',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.priority).toBe('urgent');
    });
    
    it('debe detectar prioridad HIGH', async () => {
      const email: ParsedEmail = {
        messageId: 'test_high',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Importante: Problema con pedido',
        body: 'Tengo un problema importante que necesito resolver',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.priority).toBe('high');
    });
    
    it('debe detectar prioridad LOW', async () => {
      const email: ParsedEmail = {
        messageId: 'test_low',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Info general',
        body: 'Cuando puedas, sin prisa, me gustaría información',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.priority).toBe('low');
    });
  });
  
  describe('Análisis de Sentimiento', () => {
    
    it('debe detectar sentimiento POSITIVE', async () => {
      const email: ParsedEmail = {
        messageId: 'test_pos',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Gracias por el excelente servicio',
        body: 'Todo perfecto, muy satisfecho. Gracias! 😊',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.sentiment).toBe('positive');
      expect(result.sentimentScore).toBeGreaterThan(0.6);
    });
    
    it('debe detectar sentimiento NEGATIVE', async () => {
      const email: ParsedEmail = {
        messageId: 'test_neg',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Queja sobre mal servicio',
        body: 'Muy mal, pésimo, no funciona. Problema grave ❌',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.sentiment).toBe('negative');
      expect(result.sentimentScore).toBeLessThan(0.4);
    });
  });
  
  describe('Extracción de Entidades', () => {
    
    it('debe extraer números de pedidos', async () => {
      const email: ParsedEmail = {
        messageId: 'test_entities',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Consulta pedidos',
        body: 'Pregunto por el pedido #1234 y ORD-5678',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.relatedEntities.orders).toHaveLength(2);
      expect(result.relatedEntities.orders).toContain('#1234');
    });
    
    it('debe extraer SKUs de productos', async () => {
      const email: ParsedEmail = {
        messageId: 'test_skus',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Consulta productos',
        body: 'Necesito SKU-001 y REF-ABC-123',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.relatedEntities.products).toBeDefined();
      expect(result.relatedEntities.products!.length).toBeGreaterThan(0);
    });
  });
  
  describe('Action Items', () => {
    
    it('debe detectar que requiere acción', async () => {
      const email: ParsedEmail = {
        messageId: 'test_action',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Pregunta',
        body: '¿Podrías enviarme información? Por favor, necesito una respuesta',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.requiresAction).toBe(true);
    });
    
    it('debe extraer action items', async () => {
      const email: ParsedEmail = {
        messageId: 'test_items',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'Tareas pendientes',
        body: `Por favor:
        1. Necesito la cotización actualizada
        2. Envía el catálogo completo
        3. Confirma fecha de entrega`,
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.actionItems.length).toBeGreaterThan(0);
    });
  });
  
  describe('Suggested Due Date', () => {
    
    it('debe sugerir fecha límite para email urgente', async () => {
      const email: ParsedEmail = {
        messageId: 'test_due',
        threadId: 'thread',
        from: 'cliente@example.com',
        to: ['ventas@santabrisa.com'],
        subject: 'URGENTE',
        body: 'Necesito esto ASAP',
        date: new Date().toISOString(),
        attachments: [],
      };
      
      const result = await analyzeEmailWithGemini(email);
      
      expect(result.suggestedDueDate).toBeDefined();
      
      // Verificar que es aproximadamente +1 hora para urgentes
      const dueDate = new Date(result.suggestedDueDate!);
      const now = new Date();
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 3600);
      
      expect(diffHours).toBeGreaterThan(0);
      expect(diffHours).toBeLessThan(2); // Menos de 2 horas para urgente
    });
  });
});
