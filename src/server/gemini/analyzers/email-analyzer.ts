/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/gemini/analyzers/email-analyzer.ts
import 'server-only';

import type { ParsedEmail, EmailAnalysis } from '@/server/integrations/gmail/types';
import type { Department } from '@/domain/ssot';
import { getGeminiClient } from '../gemini-client';

/**
 * EMAIL ANALYZER - Gemini
 * 
 * Analiza emails con IA para:
 * - Clasificar por departamento (SALES, OPS, QUALITY, FINANCE, etc.)
 * - Detectar prioridad
 * - Analizar sentimiento
 * - Extraer entidades
 * - Sugerir asignación
 * - Recomendar acciones
 */

export interface EmailAnalysisResult extends EmailAnalysis {
  department: Department;
  suggestedAssignee?: string;
  suggestedDueDate?: string;
  actionItems: string[];
  relatedEntities: {
    orders?: string[];
    accounts?: string[];
    products?: string[];
    shipments?: string[];
    invoices?: string[];
  };
}

/**
 * Analizar email con Gemini - REAL API
 */
export async function analyzeEmailWithGemini(
  email: ParsedEmail,
  context?: {
    accountHistory?: any;
    recentOrders?: any[];
    recentInteractions?: any[];
  }
): Promise<EmailAnalysisResult> {
  
  const gemini = getGeminiClient();
  
  try {
    console.log('[Email Analyzer] 🤖 Calling Gemini API for email:', email.subject);
    
    // Construir prompt optimizado para Gemini
    const prompt = buildEmailAnalysisPrompt(email, context);
    
    // Llamar a Gemini API con complejidad 'simple' (emails son análisis rápido)
    const response = await gemini.generateJSON<EmailAnalysisResult>(
      prompt,
      {
        from: email.from,
        subject: email.subject,
        bodyPreview: email.body.substring(0, 500),
        hasAttachments: (email.attachments?.length || 0) > 0,
        context
      },
      'simple'
    );

    return response;
    
  } catch (error) {
    console.error('[Email Analyzer] ❌ Gemini API error:', error);
    console.log('[Email Analyzer] 🔄 Falling back to rules-based analysis');
    
    // Fallback: análisis basado en reglas si falla Gemini
    return await analyzeWithRulesAndMockAI(email, context);
  }
}

// =================================================================
// PROMPT BUILDER
// =================================================================

function buildEmailAnalysisPrompt(
  email: ParsedEmail,
  context?: any
): string {
  return `
Eres un asistente de IA especializado en analizar emails para un ERP de distribución de productos de higiene profesional.

CONTEXTO DE LA EMPRESA:
- Empresa: Santa Brisa - Distribución de productos de higiene profesional
- Departamentos: VENTAS, OPS (operaciones/logística), ALMACEN, CALIDAD, FINANZAS, MARKETING, PRODUCCION, PERSONAL
- Clientes: Hoteles, restaurantes, hospitales, empresas de limpieza

EMAIL A ANALIZAR:
De: ${email.from}
Asunto: ${email.subject}
Fecha: ${email.date}
Cuerpo:
${email.body.substring(0, 1500)}
${(email.attachments?.length || 0) > 0 ? `\nAdjuntos: ${email.attachments?.map(a => a.filename).join(', ')}` : ''}

${context?.accountHistory ? `
HISTORIAL DE LA CUENTA:
- Pedidos recientes: ${context.recentOrders?.length || 0}
- Última interacción: ${context.recentInteractions?.[0]?.date || 'N/A'}
` : ''}

TAREA:
Analiza este email y devuelve UN OBJETO JSON (sin markdown, sin explicaciones) con esta estructura EXACTA:

{
  "department": "VENTAS|OPS|ALMACEN|CALIDAD|FINANZAS|MARKETING|PRODUCCION|PERSONAL",
  "priority": "urgent|high|medium|low",
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.0-1.0,
  "category": "prospection|support|complaint|order|general",
  "requiresAction": true|false,
  "actionItems": ["texto de acción 1", "texto de acción 2"],
  "entities": {
    "orders": ["#1234"],
    "products": ["SKU-001"],
    "invoices": ["FAC-1234"],
    "amounts": ["100 units"]
  },
  "suggestedAssignee": "nombre_usuario o null",
  "suggestedDueDate": "ISO date string o null",
  "relatedEntities": {
    "orders": ["#1234"],
    "products": ["SKU-001"]
  }
}

CRITERIOS DE CLASIFICACIÓN:

DEPARTAMENTO:
- VENTAS: Cotizaciones, precios, interés en productos, visitas comerciales
- OPS: Logística, envíos, tracking, coordinación operativa
- ALMACEN: Stock, disponibilidad, almacén, inventario
- CALIDAD: Certificados, especificaciones técnicas, lotes, caducidad
- FINANZAS: Facturas, pagos, contabilidad, transferencias
- MARKETING: Eventos, activaciones, promociones, degustaciones
- PRODUCCION: Fabricación, envasado, fórmulas
- PERSONAL: RRHH, nóminas, contratos

PRIORIDAD:
- urgent: Palabras como "urgente", "ASAP", "inmediato", "ya", "emergencia"
- high: "Importante", "necesito", "problema", "error", "queja"
- medium: Email normal de trabajo
- low: "Cuando puedas", "sin prisa", "informativo"

SENTIMIENTO:
- positive (0.7-1.0): "Gracias", "excelente", "perfecto", "satisfecho"
- neutral (0.4-0.6): Consulta normal de trabajo
- negative (0.0-0.3): "Mal", "error", "problema", "queja", "insatisfecho"

ACCIÓN REQUERIDA:
- true: Email tiene preguntas (¿?), solicitudes ("por favor", "necesito"), o requiere respuesta
- false: Email informativo o FYI

Devuelve SOLO el objeto JSON, sin markdown ni texto adicional.
`;
}

// =================================================================
// RULES-BASED ANALYSIS (+ Mock AI)
// =================================================================

async function analyzeWithRulesAndMockAI(
  email: ParsedEmail,
  context?: any
): Promise<EmailAnalysisResult> {
  
  const subject = email.subject.toLowerCase();
  const body = email.body.toLowerCase();
  const combined = subject + ' ' + body;
  
  // 1. CLASIFICAR POR DEPARTAMENTO
  const department = classifyDepartment(combined);
  
  // 2. DETECTAR PRIORIDAD
  const priority = detectPriority(combined, email);
  
  // 3. ANALIZAR SENTIMIENTO
  const { sentiment, sentimentScore } = analyzeSentiment(combined);
  
  // 4. CATEGORIZAR
  const category = categorizeEmail(combined);
  
  // 5. DETECTAR ACCIÓN REQUERIDA
  const requiresAction = detectRequiresAction(combined);
  
  // 6. EXTRAER ENTIDADES
  const entities = extractEntities(combined);
  
  // 7. SUGERIR ASIGNACIÓN
  const { suggestedAssignee, suggestedDueDate } = suggestAssignment(
    department,
    priority,
    requiresAction
  );
  
  // 8. IDENTIFICAR ACTION ITEMS
  const actionItems = extractActionItems(combined);
  
  return {
    department,
    priority,
    sentiment,
    sentimentScore,
    category,
    requiresAction,
    entities,
    suggestedAssignee,
    suggestedDueDate,
    actionItems,
    relatedEntities: entities,
  };
}

// =================================================================
// CLASSIFY DEPARTMENT
// =================================================================

function classifyDepartment(text: string): Department {
  // VENTAS keywords
  if (
    text.includes('cotiz') ||
    text.includes('precio') ||
    text.includes('comprar') ||
    text.includes('interesa') ||
    text.includes('catálogo') ||
    text.includes('productos') ||
    text.includes('visita') ||
    text.includes('comercial') ||
    text.includes('venta') ||
    text.includes('cliente')
  ) {
    return 'VENTAS';
  }
  
  // ALMACEN (OPS/Logística) keywords
  if (
    text.includes('envío') ||
    text.includes('envio') ||
    text.includes('entrega') ||
    text.includes('tracking') ||
    text.includes('stock') ||
    text.includes('disponibilidad') ||
    text.includes('almacén') ||
    text.includes('logística') ||
    text.includes('transporte')
  ) {
    return 'ALMACEN';
  }
  
  // CALIDAD keywords
  if (
    text.includes('calidad') ||
    text.includes('certificado') ||
    text.includes('especificación') ||
    text.includes('lote') ||
    text.includes('caducidad') ||
    text.includes('ficha técnica') ||
    text.includes('msds') ||
    text.includes('trazabilidad') ||
    text.includes('análisis')
  ) {
    return 'CALIDAD';
  }
  
  // FINANZAS keywords
  if (
    text.includes('factura') ||
    text.includes('pago') ||
    text.includes('cobro') ||
    text.includes('contabilidad') ||
    text.includes('fiscal') ||
    text.includes('iva') ||
    text.includes('transferencia')
  ) {
    return 'FINANZAS';
  }
  
  // MARKETING keywords
  if (
    text.includes('evento') ||
    text.includes('activación') ||
    text.includes('promoción') ||
    text.includes('campaña') ||
    text.includes('degustación') ||
    text.includes('marketing')
  ) {
    return 'MARKETING';
  }
  
  // PRODUCCION keywords
  if (
    text.includes('producción') ||
    text.includes('produccion') ||
    text.includes('fabricación') ||
    text.includes('envasado') ||
    text.includes('fórmula')
  ) {
    return 'PRODUCCION';
  }
  
  // Default: OPS (operaciones generales)
  return 'OPS';
}

// =================================================================
// DETECT PRIORITY
// =================================================================

function detectPriority(
  text: string,
  email: ParsedEmail
): 'low' | 'medium' | 'high' | 'urgent' {
  
  // URGENT keywords
  if (
    text.includes('urgente') ||
    text.includes('urgent') ||
    text.includes('asap') ||
    text.includes('inmediato') ||
    text.includes('ya') ||
    text.includes('ahora mismo') ||
    text.includes('emergencia')
  ) {
    return 'urgent';
  }
  
  // HIGH priority keywords
  if (
    text.includes('importante') ||
    text.includes('important') ||
    text.includes('prioridad') ||
    text.includes('necesito') ||
    text.includes('problema') ||
    text.includes('error') ||
    text.includes('queja') ||
    text.includes('reclamo')
  ) {
    return 'high';
  }
  
  // LOW priority keywords
  if (
    text.includes('cuando puedas') ||
    text.includes('cuando tengas tiempo') ||
    text.includes('sin prisa') ||
    text.includes('informativo')
  ) {
    return 'low';
  }
  
  // Default: medium
  return 'medium';
}

// =================================================================
// ANALYZE SENTIMENT
// =================================================================

function analyzeSentiment(text: string): {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
} {
  const positiveKeywords = [
    'gracias', 'excelente', 'perfecto', 'genial', 'contento',
    'satisfecho', 'bien', 'bueno', 'feliz', '😊', '👍', '✅'
  ];
  
  const negativeKeywords = [
    'mal', 'error', 'problema', 'queja', 'insatisfecho',
    'molesto', 'terrible', 'pésimo', '😠', '❌', 'no funciona'
  ];
  
  let score = 0.5; // neutral por defecto
  
  for (const keyword of positiveKeywords) {
    if (text.includes(keyword)) score += 0.1;
  }
  
  for (const keyword of negativeKeywords) {
    if (text.includes(keyword)) score -= 0.1;
  }
  
  score = Math.max(0, Math.min(1, score)); // Clamp entre 0 y 1
  
  let sentiment: 'positive' | 'neutral' | 'negative';
  if (score > 0.6) sentiment = 'positive';
  else if (score < 0.4) sentiment = 'negative';
  else sentiment = 'neutral';
  
  return { sentiment, sentimentScore: score };
}

// =================================================================
// CATEGORIZE EMAIL
// =================================================================

function categorizeEmail(text: string): 'prospection' | 'support' | 'complaint' | 'order' | 'general' {
  if (text.includes('pedido') || text.includes('order') || text.includes('compra')) {
    return 'order';
  }
  
  if (text.includes('queja') || text.includes('reclamo') || text.includes('insatisfecho')) {
    return 'complaint';
  }
  
  if (text.includes('ayuda') || text.includes('soporte') || text.includes('problema')) {
    return 'support';
  }
  
  if (text.includes('interesa') || text.includes('información') || text.includes('catálogo')) {
    return 'prospection';
  }
  
  return 'general';
}

// =================================================================
// DETECT REQUIRES ACTION
// =================================================================

function detectRequiresAction(text: string): boolean {
  const actionIndicators = [
    '?',  // Pregunta
    'por favor',
    'please',
    'podrías',
    'puedes',
    'necesito',
    'quiero',
    'me gustaría',
    'cuando',
    'confirma',
    'envía',
    'manda',
  ];
  
  return actionIndicators.some(indicator => text.includes(indicator));
}

// =================================================================
// EXTRACT ENTITIES
// =================================================================

function extractEntities(text: string) {
  const entities: any = {};
  
  // Pedidos: #1234, ORD-1234, pedido 1234
  const orderPattern = /#(\d+)|ORD-(\d+)|pedido\s+(\d+)/gi;
  const orderMatches = text.match(orderPattern);
  if (orderMatches) {
    entities.orders = orderMatches.map(m => m.replace(/\s+/g, ''));
  }
  
  // Productos: SKU-xxx, REF-xxx
  const productPattern = /SKU-[\w\d-]+|REF-[\w\d-]+|ART-[\w\d-]+/gi;
  const productMatches = text.match(productPattern);
  if (productMatches) {
    entities.products = productMatches;
  }
  
  // Facturas: FAC-1234, FRA-1234
  const invoicePattern = /FAC-\d+|FRA-\d+|factura\s+(\d+)/gi;
  const invoiceMatches = text.match(invoicePattern);
  if (invoiceMatches) {
    entities.invoices = invoiceMatches;
  }
  
  // Envíos: ENV-1234, SHP-1234
  const shipmentPattern = /ENV-\d+|SHP-\d+|envío\s+(\d+)/gi;
  const shipmentMatches = text.match(shipmentPattern);
  if (shipmentMatches) {
    entities.shipments = shipmentMatches;
  }
  
  // Cantidades: 100 units, 50kg, €1500
  const amountPattern = /\d+\s*(units?|kg|litros?|€|EUR)/gi;
  const amountMatches = text.match(amountPattern);
  if (amountMatches) {
    entities.amounts = amountMatches;
  }
  
  return entities;
}

// =================================================================
// SUGGEST ASSIGNMENT
// =================================================================

function suggestAssignment(
  department: Department,
  priority: string,
  requiresAction: boolean
): {
  suggestedAssignee?: string;
  suggestedDueDate?: string;
} {
  if (!requiresAction) {
    return {};
  }
  
  // Calcular due date según prioridad
  let hoursToAdd = 48; // default
  
  switch (priority) {
    case 'urgent':
      hoursToAdd = 1;
      break;
    case 'high':
      hoursToAdd = 24;
      break;
    case 'medium':
      hoursToAdd = 48;
      break;
    case 'low':
      hoursToAdd = 72;
      break;
  }
  
  const dueDate = new Date(Date.now() + hoursToAdd * 3600 * 1000);
  
  return {
    // TODO: Asignar usuario según departamento y disponibilidad
    suggestedAssignee: undefined, // Se puede implementar lookup en users
    suggestedDueDate: dueDate.toISOString(),
  };
}

// =================================================================
// EXTRACT ACTION ITEMS
// =================================================================

function extractActionItems(text: string): string[] {
  const actionItems: string[] = [];
  
  // Buscar líneas con keywords de acción
  const lines = text.split('\n');
  
  const actionKeywords = [
    'necesito',
    'requiero',
    'por favor',
    'podrías',
    'puedes',
    'confirma',
    'envía',
    'manda',
  ];
  
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    if (actionKeywords.some(keyword => lineLower.includes(keyword))) {
      const cleaned = line.trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        actionItems.push(cleaned);
      }
    }
  }
  
  // Limitar a 5 action items más relevantes
  return actionItems.slice(0, 5);
}

// =================================================================
// GEMINI PROMPT TEMPLATES
// =================================================================

export const EMAIL_ANALYSIS_PROMPT_TEMPLATE = `
Eres un asistente de IA especializado en clasificar emails para un ERP empresarial.

Analiza el siguiente email y devuelve un JSON con esta estructura:

{
  "department": "SALES|OPS|QUALITY|FINANCE|MARKETING|ADMIN",
  "priority": "urgent|high|medium|low",
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.0-1.0,
  "category": "prospection|support|complaint|order|general",
  "requiresAction": true|false,
  "actionItems": ["acción 1", "acción 2"],
  "entities": {
    "orders": ["#1234"],
    "products": ["SKU-001"],
    "invoices": ["FAC-1234"],
    "amounts": ["100 units", "€1500"]
  },
  "suggestedResponse": "Sugerencia de respuesta breve",
  "summary": "Resumen del email en 1 línea"
}

EMAIL:
De: {from}
Asunto: {subject}
Cuerpo: {body}

Contexto: {context}

Devuelve SOLO el JSON, sin texto adicional.
`;

// =================================================================
// BATCH ANALYSIS
// =================================================================

/**
 * Analizar múltiples emails en batch
 */
export async function analyzeEmail(
  email: ParsedEmail,
  context?: any
): Promise<EmailAnalysisResult> {
  const useRulesOnly =
    process.env.USE_GEMINI === 'false' ||
    process.env.NODE_ENV === 'test' ||
    process.env.CI === 'true';

  if (useRulesOnly) {
    return analyzeWithRulesAndMockAI(email, context);
  }
  return analyzeEmailWithGemini(email, context);
}

export async function analyzeEmailsBatch(
  emails: ParsedEmail[]
): Promise<Map<string, EmailAnalysisResult>> {
  const results = new Map<string, EmailAnalysisResult>();
  
  // Analizar en paralelo (max 10 a la vez para no sobrecargar)
  const chunks = chunkArray(emails, 10);
  
  for (const chunk of chunks) {
    const promises = chunk.map(async (email) => {
      const analysis = await analyzeEmailWithGemini(email);
      results.set(email.messageId, analysis);
    });
    
    await Promise.all(promises);
  }
  
  return results;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// =================================================================
// DEPARTMENT ROUTING
// =================================================================

/**
 * Obtener usuarios del departamento para asignación
 */
export async function getUsersForDepartment(department: Department): Promise<string[]> {
  // TODO: Implementar lookup real en colección users
  // Por ahora, retorna placeholder
  
  const departmentUsers: Record<Department, string[]> = {
    VENTAS: ['sales_rep_1', 'sales_rep_2'],
    OPS: ['ops_manager_1'],
    ALMACEN: ['warehouse_manager_1'],
    CALIDAD: ['quality_manager_1'],
    FINANZAS: ['accountant_1'],
    MARKETING: ['marketing_manager_1'],
    PRODUCCION: ['production_manager_1'],
    PERSONAL: ['hr_manager_1'],
  };
  
  return departmentUsers[department] || [];
}
