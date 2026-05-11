// tests/gmail/document-analyzer.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeDocument } from '@/server/gemini/analyzers/document-analyzer';
import type { EmailAttachment } from '@/server/integrations/gmail/types';

describe('Document Analyzer', () => {

  describe('Clasificación de Documentos', () => {

    it('debe clasificar presupuesto', async () => {
      const attachment: EmailAttachment = {
        filename: 'Presupuesto_2025_Cliente_ABC.pdf',
        mimeType: 'application/pdf',
        size: 125000,
        attachmentId: 'att_1',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Cotización solicitada',
        body: 'Adjunto presupuesto',
        from: 'ventas@santabrisa.com',
      });

      expect(result.type).toBe('PRESUPUESTO');
      expect(result.suggestedStorage.collection).toBe('quotes');
      expect(result.requiresAction).toBe(true);
    });

    it('debe clasificar factura y extraer número', async () => {
      const attachment: EmailAttachment = {
        filename: 'FAC-1234_enero_2025.pdf',
        mimeType: 'application/pdf',
        size: 85000,
        attachmentId: 'att_2',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Factura #1234',
        body: 'Adjunto factura',
        from: 'finanzas@proveedor.com',
      });

      expect(result.type).toBe('FACTURA');
      expect(result.extractedInfo.documentNumber).toBe('1234');
      expect(result.suggestedStorage.collection).toBe('invoices');
      expect(result.requiresAction).toBe(true);
      expect(result.suggestedAction).toContain('factura');
    });

    it('debe clasificar contrato', async () => {
      const attachment: EmailAttachment = {
        filename: 'Contrato_Distribucion_2025.pdf',
        mimeType: 'application/pdf',
        size: 250000,
        attachmentId: 'att_3',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Contrato de distribución',
        body: 'Adjunto contrato para revisión',
        from: 'legal@cliente.com',
      });

      expect(result.type).toBe('CONTRATO');
      expect(result.suggestedStorage.collection).toBe('contracts');
      expect(result.requiresAction).toBe(true);
    });

    it('debe clasificar certificado de calidad', async () => {
      const attachment: EmailAttachment = {
        filename: 'Certificado_Lote_L-2025-001.pdf',
        mimeType: 'application/pdf',
        size: 95000,
        attachmentId: 'att_4',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'CoA Lote L-2025-001',
        body: 'Adjunto certificado de análisis',
        from: 'calidad@proveedor.com',
      });

      expect(result.type).toBe('CERTIFICADO');
      expect(result.extractedInfo.lotCode).toBe('L-2025-001');
      expect(result.suggestedStorage.collection).toBe('qc_documents');
      expect(result.suggestedStorage.linkTo?.type).toBe('lot');
      expect(result.suggestedStorage.linkTo?.id).toBe('L-2025-001');
    });

    it('debe clasificar albarán', async () => {
      const attachment: EmailAttachment = {
        filename: 'Albaran_ENV-5678.pdf',
        mimeType: 'application/pdf',
        size: 75000,
        attachmentId: 'att_5',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Albarán de entrega',
        body: 'Adjunto albarán',
        from: 'logistica@transportista.com',
      });

      expect(result.type).toBe('ALBARAN');
      expect(result.suggestedStorage.collection).toBe('delivery_notes');
    });

    it('debe clasificar pedido', async () => {
      const attachment: EmailAttachment = {
        filename: 'PED-9876_Cliente_XYZ.pdf',
        mimeType: 'application/pdf',
        size: 105000,
        attachmentId: 'att_6',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Nuevo pedido',
        body: 'Adjunto pedido de compra',
        from: 'compras@cliente.com',
      });

      expect(result.type).toBe('PEDIDO');
      expect(result.extractedInfo.documentNumber).toBe('9876');
      expect(result.requiresAction).toBe(true);
    });

    it('debe clasificar ficha técnica', async () => {
      const attachment: EmailAttachment = {
        filename: 'MSDS_SKU-001_2025.pdf',
        mimeType: 'application/pdf',
        size: 180000,
        attachmentId: 'att_7',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Ficha de seguridad',
        body: 'Adjunto MSDS actualizada',
        from: 'tecnico@proveedor.com',
      });

      expect(result.type).toBe('FICHA_TECNICA');
    });

    it('debe clasificar foto', async () => {
      const attachment: EmailAttachment = {
        filename: 'foto_almacen_20250119.jpg',
        mimeType: 'image/jpeg',
        size: 2500000,
        attachmentId: 'att_8',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Fotos del almacén',
        body: 'Adjunto fotos',
        from: 'ops@santabrisa.com',
      });

      expect(result.type).toBe('FOTO');
    });
  });

  describe('Extracción de Información', () => {

    it('debe extraer número de documento', async () => {
      const attachment: EmailAttachment = {
        filename: 'Invoice_INV-12345_Client.pdf',
        mimeType: 'application/pdf',
        size: 95000,
        attachmentId: 'att_num',
      };

      const result = await analyzeDocument(attachment, {
        subject: '',
        body: '',
        from: '',
      });

      expect(result.extractedInfo.documentNumber).toBe('12345');
    });

    it('debe extraer fecha del documento', async () => {
      const attachment: EmailAttachment = {
        filename: 'Factura_2025-01-15_Cliente.pdf',
        mimeType: 'application/pdf',
        size: 85000,
        attachmentId: 'att_date',
      };

      const result = await analyzeDocument(attachment, {
        subject: '',
        body: '',
        from: '',
      });

      expect(result.extractedInfo.date).toBe('2025-01-15');
    });

    it('debe extraer importe', async () => {
      const attachment: EmailAttachment = {
        filename: 'Presupuesto_€1500_Cliente.pdf',
        mimeType: 'application/pdf',
        size: 95000,
        attachmentId: 'att_amount',
      };

      const result = await analyzeDocument(attachment, {
        subject: '',
        body: '',
        from: '',
      });

      expect(result.extractedInfo.amount).toBe(1500);
      expect(result.extractedInfo.currency).toBe('EUR');
    });

    it('debe extraer lote de certificado', async () => {
      const attachment: EmailAttachment = {
        filename: 'COA_L-2025-042.pdf',
        mimeType: 'application/pdf',
        size: 120000,
        attachmentId: 'att_lot',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Certificado lote',
        body: '',
        from: 'calidad@proveedor.com',
      });

      expect(result.extractedInfo.lotCode).toBe('L-2025-042');
    });
  });

  describe('Sugerencias de Almacenamiento', () => {

    it('debe sugerir collection correcta para cada tipo', async () => {
      const testCases: Array<{ filename: string; expectedCollection: string }> = [
        { filename: 'Presupuesto_123.pdf', expectedCollection: 'quotes' },
        { filename: 'Factura_456.pdf', expectedCollection: 'invoices' },
        { filename: 'Contrato_789.pdf', expectedCollection: 'contracts' },
        { filename: 'Albaran_012.pdf', expectedCollection: 'delivery_notes' },
        { filename: 'Certificado_345.pdf', expectedCollection: 'qc_documents' },
      ];

      for (const testCase of testCases) {
        const attachment: EmailAttachment = {
          filename: testCase.filename,
          mimeType: 'application/pdf',
          size: 100000,
          attachmentId: `att_${testCase.filename}`,
        };

        const result = await analyzeDocument(attachment, {
          subject: '',
          body: '',
          from: '',
        });

        expect(result.suggestedStorage.collection).toBe(testCase.expectedCollection);
      }
    });

    it('debe vincular documento a cuenta si está disponible', async () => {
      const attachment: EmailAttachment = {
        filename: 'Factura_FAC-1234.pdf',
        mimeType: 'application/pdf',
        size: 95000,
        attachmentId: 'att_link',
      };

      const result = await analyzeDocument(attachment, {
        subject: 'Factura',
        body: '',
        from: 'cliente@example.com',
        accountId: 'acc_789',
      });

      expect(result.suggestedStorage.linkTo).toBeDefined();
      expect(result.suggestedStorage.linkTo?.type).toBe('account');
      expect(result.suggestedStorage.linkTo?.id).toBe('acc_789');
    });
  });

  describe('Detección de Acción Requerida', () => {

    it('debe requerir acción para presupuesto', async () => {
      const attachment: EmailAttachment = {
        filename: 'Presupuesto_Cliente.pdf',
        mimeType: 'application/pdf',
        size: 95000,
        attachmentId: 'att_action_1',
      };

      const result = await analyzeDocument(attachment, {
        subject: '',
        body: '',
        from: '',
      });

      expect(result.requiresAction).toBe(true);
      expect(result.suggestedAction).toBeDefined();
      expect(result.suggestedAction).toContain('presupuesto');
    });

    it('debe requerir acción para factura', async () => {
      const attachment: EmailAttachment = {
        filename: 'Factura_1234.pdf',
        mimeType: 'application/pdf',
        size: 85000,
        attachmentId: 'att_action_2',
      };

      const result = await analyzeDocument(attachment, {
        subject: '',
        body: '',
        from: '',
      });

      expect(result.requiresAction).toBe(true);
      expect(result.suggestedAction).toContain('factura');
    });

    it('NO debe requerir acción para certificado', async () => {
      const attachment: EmailAttachment = {
        filename: 'Certificado_Lote.pdf',
        mimeType: 'application/pdf',
        size: 100000,
        attachmentId: 'att_no_action',
      };

      const result = await analyzeDocument(attachment, {
        subject: '',
        body: '',
        from: '',
      });

      expect(result.requiresAction).toBe(false);
    });
  });
});
