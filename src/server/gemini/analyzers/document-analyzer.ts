/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/gemini/analyzers/document-analyzer.ts
import 'server-only';

import type { EmailAttachment } from '@/server/integrations/gmail/types';

/**
 * DOCUMENT ANALYZER - Gemini
 * 
 * Analiza attachments de emails para:
 * - Clasificar tipo de documento (presupuesto, contrato, factura, etc.)
 * - Extraer información clave (números, fechas, importes)
 * - Sugerir almacenamiento (Firestore collection + metadata)
 * - Detectar si requiere acción
 */

export type DocumentType =
  | 'PRESUPUESTO'      // Cotización, budget, quote
  | 'CONTRATO'         // Contract, agreement
  | 'FACTURA'          // Invoice, bill
  | 'ALBARAN'          // Delivery note, packing slip
  | 'PEDIDO'           // Purchase order
  | 'CERTIFICADO'      // Certificate (calidad, análisis)
  | 'FICHA_TECNICA'    // Technical datasheet, MSDS
  | 'PLANO'            // Technical drawing
  | 'FOTO'             // Photo, image
  | 'OTRO';            // Other

export interface DocumentAnalysisResult {
  filename: string;
  mimeType: string;
  type: DocumentType;
  confidence: number;
  
  // Información extraída
  extractedInfo: {
    documentNumber?: string;      // Número de doc (FAC-1234, etc.)
    date?: string;                // Fecha del documento
    amount?: number;              // Importe total
    currency?: string;            // Moneda
    supplier?: string;            // Proveedor/emisor
    customer?: string;            // Cliente/receptor
    items?: string[];             // Productos mencionados
    validUntil?: string;          // Validez (presupuestos)
    lotCode?: string;           // Número de lote (certificados)
  };
  
  // Sugerencias de almacenamiento
  suggestedStorage: {
    collection: string;           // 'documents' o collection específica
    metadata: Record<string, any>;
    linkTo?: {
      type: 'account' | 'order' | 'shipment' | 'lot';
      id: string;
    };
  };
  
  // Acción requerida
  requiresAction: boolean;
  suggestedAction?: string;
}

/**
 * Analizar documento con Gemini
 */
export async function analyzeDocument(
  attachment: EmailAttachment,
  emailContext: {
    subject: string;
    body: string;
    from: string;
    accountId?: string;
  }
): Promise<DocumentAnalysisResult> {
  
  console.log(`[Document Analyzer] Analyzing: ${attachment.filename}`);
  
  // Clasificar por filename y mimeType primero
  const type = classifyByFilename(attachment.filename, attachment.mimeType);
  
  // TODO: Si es PDF, extraer texto con Gemini Vision/PDF parsing
  // TODO: Si es imagen, usar Gemini Vision
  // Por ahora, análisis basado en reglas
  
  const extractedInfo = extractInfoFromFilename(attachment.filename, type);
  
  const suggestedStorage = suggestStorage(type, extractedInfo, emailContext);
  
  const requiresAction = detectDocumentAction(type, extractedInfo);
  
  return {
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    type,
    confidence: 0.85, // Mock confidence
    extractedInfo,
    suggestedStorage,
    requiresAction,
    suggestedAction: requiresAction 
      ? generateActionSuggestion(type, extractedInfo)
      : undefined,
  };
}

// =================================================================
// CLASSIFY BY FILENAME
// =================================================================

function classifyByFilename(filename: string, mimeType: string): DocumentType {
  const name = filename.toLowerCase();
  
  // PRESUPUESTO
  if (
    name.includes('presupuesto') ||
    name.includes('cotiz') ||
    name.includes('quote') ||
    name.includes('budget') ||
    name.includes('proforma')
  ) {
    return 'PRESUPUESTO';
  }
  
  // CONTRATO
  if (
    name.includes('contrato') ||
    name.includes('contract') ||
    name.includes('agreement') ||
    name.includes('acuerdo')
  ) {
    return 'CONTRATO';
  }
  
  // FACTURA
  if (
    name.includes('factura') ||
    name.includes('invoice') ||
    name.includes('bill') ||
    name.includes('fac-') ||
    name.includes('inv-')
  ) {
    return 'FACTURA';
  }
  
  // ALBARAN
  if (
    name.includes('albarán') ||
    name.includes('albaran') ||
    name.includes('delivery') ||
    name.includes('packing') ||
    name.includes('alb-')
  ) {
    return 'ALBARAN';
  }
  
  // PEDIDO
  if (
    name.includes('pedido') ||
    name.includes('order') ||
    name.includes('po-') ||
    name.includes('ped-')
  ) {
    return 'PEDIDO';
  }
  
  // CERTIFICADO
  if (
    name.includes('certificado') ||
    name.includes('certificate') ||
    name.includes('análisis') ||
    name.includes('analysis') ||
    name.includes('coa') ||
    name.includes('cert-')
  ) {
    return 'CERTIFICADO';
  }
  
  // FICHA TECNICA
  if (
    name.includes('ficha') ||
    name.includes('datasheet') ||
    name.includes('spec') ||
    name.includes('msds') ||
    name.includes('tds')
  ) {
    return 'FICHA_TECNICA';
  }
  
  // PLANO
  if (
    name.includes('plano') ||
    name.includes('drawing') ||
    name.includes('blueprint') ||
    name.includes('.dwg') ||
    name.includes('.dxf')
  ) {
    return 'PLANO';
  }
  
  // FOTO
  if (
    mimeType.startsWith('image/') ||
    name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
  ) {
    return 'FOTO';
  }
  
  // Default
  return 'OTRO';
}

// =================================================================
// EXTRACT INFO FROM FILENAME
// =================================================================

function extractInfoFromFilename(
  filename: string,
  type: DocumentType
): DocumentAnalysisResult['extractedInfo'] {
  const info: DocumentAnalysisResult['extractedInfo'] = {};
  
  // Número de documento
  const docNumberPatterns = [
    /FAC-(\d+)/i,
    /INV-(\d+)/i,
    /ALB-(\d+)/i,
    /PED-(\d+)/i,
    /PRES-(\d+)/i,
    /CERT-(\d+)/i,
    /(\d{4,})/,  // Cualquier número de 4+ dígitos
  ];
  
  for (const pattern of docNumberPatterns) {
    const match = filename.match(pattern);
    if (match) {
      info.documentNumber = match[1] || match[0];
      break;
    }
  }
  
  // Fecha (YYYY-MM-DD, YYYYMMDD, DD-MM-YYYY)
  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{8})/,
    /(\d{2})-(\d{2})-(\d{4})/,
  ];
  
  for (const pattern of datePatterns) {
    const match = filename.match(pattern);
    if (match) {
      info.date = match[0];
      break;
    }
  }
  
  // Importe (€1500, 1500€, 1500EUR)
  const amountPattern = /€?(\d+(?:[.,]\d+)?)\s*€?(?:EUR)?/i;
  const amountMatch = filename.match(amountPattern);
  if (amountMatch) {
    info.amount = parseFloat(amountMatch[1].replace(',', '.'));
    info.currency = 'EUR';
  }
  
  // Lote (para certificados)
  const lotPattern = /L-\d{4}-\d{3}|LOTE-\d+|LOT-\d+/i;
  const lotMatch = filename.match(lotPattern);
  if (lotMatch) {
    info.lotCode = lotMatch[0];
  }
  
  return info;
}

// =================================================================
// SUGGEST STORAGE
// =================================================================

function suggestStorage(
  type: DocumentType,
  extractedInfo: DocumentAnalysisResult['extractedInfo'],
  emailContext: any
): DocumentAnalysisResult['suggestedStorage'] {
  
  const baseMetadata = {
    type,
    filename: extractedInfo.documentNumber,
    uploadedAt: new Date().toISOString(),
    uploadedVia: 'gmail',
    ...extractedInfo,
  };
  
  // Sugerir collection según tipo
  switch (type) {
    case 'FACTURA':
      return {
        collection: 'invoices',
        metadata: {
          ...baseMetadata,
          docNumber: extractedInfo.documentNumber,
          issueDate: extractedInfo.date,
          total: extractedInfo.amount,
        },
        linkTo: emailContext.accountId ? {
          type: 'account',
          id: emailContext.accountId,
        } : undefined,
      };
      
    case 'PRESUPUESTO':
      return {
        collection: 'quotes',
        metadata: {
          ...baseMetadata,
          quoteNumber: extractedInfo.documentNumber,
          validUntil: extractedInfo.validUntil,
          amount: extractedInfo.amount,
        },
        linkTo: emailContext.accountId ? {
          type: 'account',
          id: emailContext.accountId,
        } : undefined,
      };
      
    case 'CONTRATO':
      return {
        collection: 'contracts',
        metadata: {
          ...baseMetadata,
          contractNumber: extractedInfo.documentNumber,
          signedAt: extractedInfo.date,
        },
        linkTo: emailContext.accountId ? {
          type: 'account',
          id: emailContext.accountId,
        } : undefined,
      };
      
    case 'CERTIFICADO':
      return {
        collection: 'qc_documents',
        metadata: {
          ...baseMetadata,
          lotCode: extractedInfo.lotCode,
          analysisDate: extractedInfo.date,
        },
        linkTo: extractedInfo.lotCode ? {
          type: 'lot',
          id: extractedInfo.lotCode,
        } : undefined,
      };
      
    case 'ALBARAN':
      return {
        collection: 'delivery_notes',
        metadata: {
          ...baseMetadata,
          deliveryNoteNumber: extractedInfo.documentNumber,
          deliveryDate: extractedInfo.date,
        },
      };
      
    default:
      return {
        collection: 'documents',
        metadata: baseMetadata,
      };
  }
}

// =================================================================
// DETECT ACTION
// =================================================================

function detectDocumentAction(
  type: DocumentType,
  extractedInfo: DocumentAnalysisResult['extractedInfo']
): boolean {
  // Tipos que siempre requieren acción
  const actionRequired: DocumentType[] = [
    'PRESUPUESTO',  // Revisar y responder
    'CONTRATO',     // Revisar y firmar
    'FACTURA',      // Procesar pago
    'PEDIDO',       // Procesar pedido
  ];
  
  return actionRequired.includes(type);
}

function generateActionSuggestion(
  type: DocumentType,
  extractedInfo: DocumentAnalysisResult['extractedInfo']
): string {
  switch (type) {
    case 'PRESUPUESTO':
      return `Revisar presupuesto ${extractedInfo.documentNumber || ''} y enviar respuesta`;
      
    case 'CONTRATO':
      return `Revisar contrato ${extractedInfo.documentNumber || ''} para firma`;
      
    case 'FACTURA':
      return `Procesar factura ${extractedInfo.documentNumber || ''} - Importe: €${extractedInfo.amount || 'N/A'}`;
      
    case 'PEDIDO':
      return `Procesar pedido ${extractedInfo.documentNumber || ''}`;
      
    case 'CERTIFICADO':
      return `Archivar certificado del lote ${extractedInfo.lotCode || ''}`;
      
    default:
      return `Revisar documento`;
  }
}

// =================================================================
// BATCH DOCUMENT ANALYSIS
// =================================================================

/**
 * Analizar múltiples attachments en batch
 */
export async function analyzeDocumentsBatch(
  attachments: EmailAttachment[],
  emailContext: any
): Promise<Map<string, DocumentAnalysisResult>> {
  const results = new Map<string, DocumentAnalysisResult>();
  
  for (const attachment of attachments) {
    try {
      const analysis = await analyzeDocument(attachment, emailContext);
      results.set(attachment.filename, analysis);
    } catch (error) {
      console.error(`[Document Analyzer] Error analyzing ${attachment.filename}:`, error);
    }
  }
  
  return results;
}

// =================================================================
// DOCUMENT STATS
// =================================================================

export function getDocumentStats(analyses: DocumentAnalysisResult[]): {
  byType: Record<DocumentType, number>;
  requiresAction: number;
  total: number;
} {
  const byType: Record<DocumentType, number> = {
    PRESUPUESTO: 0,
    CONTRATO: 0,
    FACTURA: 0,
    ALBARAN: 0,
    PEDIDO: 0,
    CERTIFICADO: 0,
    FICHA_TECNICA: 0,
    PLANO: 0,
    FOTO: 0,
    OTRO: 0,
  };
  
  let requiresAction = 0;
  
  for (const analysis of analyses) {
    byType[analysis.type]++;
    if (analysis.requiresAction) {
      requiresAction++;
    }
  }
  
  return {
    byType,
    requiresAction,
    total: analyses.length,
  };
}

// =================================================================
// GEMINI VISION INTEGRATION (Future)
// =================================================================

/**
 * Analizar documento con Gemini Vision API (para PDFs e imágenes)
 * TODO: Implementar cuando se integre Gemini API real
 */
export async function analyzeDocumentWithGeminiVision(
  attachment: EmailAttachment,
  base64Data: string
): Promise<DocumentAnalysisResult> {
  
  // TODO: Usar Gemini Vision para extraer información
  // const prompt = `
  //   Analiza este documento y extrae:
  //   - Tipo (presupuesto, factura, contrato, etc.)
  //   - Número de documento
  //   - Fecha
  //   - Importe total
  //   - Emisor/Proveedor
  //   - Productos/servicios
  // `;
  
  // const response = await geminiClient.generateContentWithImage(prompt, base64Data);
  
  // Por ahora, usar análisis por filename
  return analyzeDocument(attachment, { subject: '', body: '', from: '' });
}
