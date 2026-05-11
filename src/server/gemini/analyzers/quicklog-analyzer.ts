/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// FILE: src/server/gemini/analyzers/quicklog-analyzer.ts
'use server';

import type { Department } from '@/domain/ssot';

/**
 * 🎤 QUICKLOG ANALYZER - Gemini
 * 
 * Analiza input de voz/texto para detectar intención del usuario
 * y convertirla en acciones automáticas.
 * 
 * FASE FINAL.5 - QuickLog Inteligente
 * 
 * Detecta:
 * - Tipo de acción (alerta, tarea, recordatorio, nota, pedido, visita)
 * - Departamento
 * - Prioridad
 * - Fechas mencionadas ("mañana", "en 3 días", "próxima semana")
 * - Entidades (cuentas, productos, cantidades)
 * 
 * Ejemplos de uso:
 * - "Recordarme llamar a Bar Central mañana" → Alert programada
 * - "Tengo que enviar presupuesto urgente a Hotel Mar" → Task URGENT
 * - "Visitamos el sol, pidieron 5 cajas" → Pedido (Santa Brain)
 */

// =================================================================
// TYPES
// =================================================================

export type QuickLogAction = 
  | 'CREATE_ALERT'       // Crear alerta/recordatorio
  | 'CREATE_TASK'        // Crear tarea pendiente
  | 'CREATE_REMINDER'    // Recordatorio futuro
  | 'CREATE_NOTE'        // Nota simple
  | 'CREATE_ORDER'       // Registrar pedido (Santa Brain)
  | 'LOG_VISIT';         // Registrar visita (Santa Brain)

export interface QuickLogIntent {
  action: QuickLogAction;
  confidence: number;           // 0-1 (qué tan seguro está el análisis)
  
  // Clasificación
  department: Department;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  
  // Contenido
  title: string;
  description?: string;
  
  // Fechas detectadas
  dueDate?: string;             // ISO date
  reminderAt?: string;          // ISO date para recordatorios
  
  // Entidades detectadas
  entities: {
    accounts?: string[];
    products?: string[];
    amounts?: string[];
    people?: string[];
  };
  
  // Metadata
  originalInput: string;
  language: 'es' | 'en';
}

// =================================================================
// ANALYZE QUICKLOG INTENT
// =================================================================

/**
 * Analizar QuickLog con Gemini para detectar intención
 */
export async function analyzeQuickLogIntent(
  input: string,
  userId: string,
  context?: {
    userAccounts?: any[];
    recentInteractions?: any[];
  }
): Promise<QuickLogIntent> {
  // Feature flag: usar reglas por defecto salvo que se habilite explícitamente
  const useRulesOnly =
    process.env.USE_GEMINI === 'false' ||
    process.env.QUICKLOG_AI !== 'true' ||
    process.env.NODE_ENV === 'test' ||
    process.env.CI === 'true';

  if (useRulesOnly) {
    return await analyzeWithRules(input, context);
  }

  const prompt = buildQuickLogPrompt(input, context);

  try {
    // Intentar con Gemini API real
    const { getGeminiClient } = await import('../gemini-client');
    const geminiClient = getGeminiClient();

    const response = await geminiClient.generateJSON<QuickLogIntent>(
      prompt,
      { input, userAccounts: context?.userAccounts },
      'simple' // Complejidad simple para QuickLog
    );

    console.log('[QuickLog Analyzer] Gemini response:', response);
    return response;
  } catch (error) {
    console.error('[QuickLog Analyzer] Gemini API error, using fallback:', error);

    // Fallback: análisis básico sin IA
    return await analyzeWithRules(input, context);
  }
}

// =================================================================
// RULES-BASED ANALYSIS (Fallback)
// =================================================================

async function analyzeWithRules(
  input: string,
  context?: any
): Promise<QuickLogIntent> {
  
  const lower = input.toLowerCase();
  
  // 1. DETECTAR ACCIÓN
  let action: QuickLogAction = 'CREATE_NOTE';
  let confidence = 0.7;
  
  // ALERTA/RECORDATORIO keywords
  if (
    lower.includes('recordar') ||
    lower.includes('recuérda') ||
    lower.includes('avísa') ||
    lower.includes('alerta') ||
    lower.includes('no olvid')
  ) {
    action = 'CREATE_REMINDER';
    confidence = 0.9;
  }
  
  // TAREA keywords
  else if (
    lower.includes('tarea') ||
    lower.includes('hacer') ||
    lower.includes('tengo que') ||
    lower.includes('debo') ||
    lower.includes('pendiente') ||
    lower.includes('enviar') ||
    lower.includes('preparar') ||
    lower.includes('revisar')
  ) {
    action = 'CREATE_TASK';
    confidence = 0.9;
  }
  
  // PEDIDO keywords (usar Santa Brain)
  else if (
    lower.includes('pedido') ||
    lower.includes('pidieron') ||
    lower.includes('compraron') ||
    lower.includes('vendimos') ||
    lower.includes('cajas') ||
    lower.includes('botellas')
  ) {
    action = 'CREATE_ORDER';
    confidence = 0.95;
  }
  
  // VISITA keywords (usar Santa Brain)
  else if (
    lower.includes('visitamos') ||
    lower.includes('estuvimos en') ||
    lower.includes('fuimos a') ||
    lower.includes('visita a')
  ) {
    action = 'LOG_VISIT';
    confidence = 0.95;
  }
  
  // 2. DETECTAR DEPARTAMENTO
  const department = detectDepartment(lower);
  
  // 3. DETECTAR PRIORIDAD
  const priority = detectPriority(lower);
  
  // 4. DETECTAR FECHAS
  const dates = extractDates(lower);
  
  // 5. DETECTAR ENTIDADES
  const entities = extractEntities(lower, context);
  
  // 6. GENERAR TÍTULO
  const title = generateTitle(input, action);
  
  return {
    action,
    confidence,
    department,
    priority,
    title,
    description: input,
    dueDate: dates.due,
    reminderAt: dates.reminder,
    entities,
    originalInput: input,
    language: 'es',
  };
}

// =================================================================
// DETECTION HELPERS
// =================================================================

function detectDepartment(text: string): Department {
  if (text.includes('venta') || text.includes('cliente') || text.includes('comercial')) return 'VENTAS';
  if (text.includes('marketing') || text.includes('campaña') || text.includes('evento')) return 'MARKETING';
  if (text.includes('producción') || text.includes('fabricar') || text.includes('producir')) return 'PRODUCCION';
  if (text.includes('calidad') || text.includes('lote') || text.includes('certificado')) return 'CALIDAD';
  if (text.includes('almacén') || text.includes('stock') || text.includes('inventario')) return 'ALMACEN';
  if (text.includes('finanzas') || text.includes('pago') || text.includes('factura') || text.includes('cobro')) return 'FINANZAS';
  if (text.includes('personal') || text.includes('equipo') || text.includes('contrat')) return 'PERSONAL';
  
  return 'OPS';
}

function detectPriority(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | undefined {
  if (text.includes('urgente') || text.includes('ya') || text.includes('inmediato') || text.includes('ahora')) {
    return 'URGENT';
  }
  if (text.includes('importante') || text.includes('prioridad')) {
    return 'HIGH';
  }
  if (text.includes('cuando pueda') || text.includes('sin prisa') || text.includes('no urgente')) {
    return 'LOW';
  }
  
  return 'MEDIUM';
}

// =================================================================
// DATE EXTRACTION
// =================================================================

function extractDates(text: string): { due?: string; reminder?: string } {
  const dates: any = {};
  const now = new Date();
  
  // HOY
  if (text.includes('hoy')) {
    dates.due = now.toISOString();
  }
  
  // MAÑANA
  else if (text.includes('mañana')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dates.due = tomorrow.toISOString();
  }
  
  // PASADO MAÑANA
  else if (text.includes('pasado mañana')) {
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    dates.due = dayAfterTomorrow.toISOString();
  }
  
  // EN X DÍAS
  const daysMatch = text.match(/en (\d+) días?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const future = new Date(now);
    future.setDate(future.getDate() + days);
    dates.due = future.toISOString();
  }
  
  // DÍA DE LA SEMANA (lunes, martes, miércoles, jueves, viernes, sábado, domingo)
  const dayMatch = text.match(/el (lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/i);
  if (dayMatch) {
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const targetDay = dayMatch[1].toLowerCase().replace('á', 'a').replace('é', 'e');
    const targetDayIndex = dayNames.findIndex(d => d.replace('á', 'a').replace('é', 'e') === targetDay);
    
    if (targetDayIndex !== -1) {
      const today = now.getDay();
      let daysUntil = targetDayIndex - today;
      if (daysUntil <= 0) daysUntil += 7; // Próxima semana si ya pasó
      
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysUntil);
      dates.due = targetDate.toISOString();
    }
  }
  
  // PRÓXIMA SEMANA
  else if (text.includes('próxima semana') || text.includes('proxima semana')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    dates.due = nextWeek.toISOString();
  }
  
  // ESTE/ESTA SEMANA
  else if (text.includes('esta semana') || text.includes('este semana')) {
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    dates.due = endOfWeek.toISOString();
  }
  
  // PRÓXIMO MES
  else if (text.includes('próximo mes') || text.includes('proximo mes')) {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    dates.due = nextMonth.toISOString();
  }
  
  // EN X HORAS
  const hoursMatch = text.match(/en (\d+) horas?/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1]);
    const future = new Date(now);
    future.setHours(future.getHours() + hours);
    dates.due = future.toISOString();
  }
  
  // HORA ESPECÍFICA (ejemplo: "a las 10", "a las 15:30")
  const timeMatch = text.match(/a las (\d{1,2})(?::(\d{2}))?/);
  if (timeMatch && dates.due) {
    const dueDate = new Date(dates.due);
    const hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    dueDate.setHours(hours, minutes, 0, 0);
    dates.due = dueDate.toISOString();
  }
  
  // RECORDATORIO (1 día antes del due date)
  if (dates.due && (text.includes('recuérda') || text.includes('avísa'))) {
    const reminder = new Date(dates.due);
    reminder.setDate(reminder.getDate() - 1);
    dates.reminder = reminder.toISOString();
  }
  
  return dates;
}

// =================================================================
// ENTITY EXTRACTION
// =================================================================

function extractEntities(text: string, context?: any) {
  const entities: any = {};
  
  // CUENTAS - Detección mejorada con múltiples estrategias
  const accounts: string[] = [];
  
  // 1. Patrón con prefijo (bar, restaurante, hotel, etc.)
  const prefixPattern = /(bar|restaurant|restaurante|tienda|hotel|café|cafetería|supermercado|mercado|pub|taberna|bodega|vinoteca|gastrobar|cervecería)\s+([\wáéíóúñ\s]+?)(?=\.|,|$|\s+(?:hoy|ayer|mañana|pidieron|compraron|visitamos))/gi;
  let match;
  while ((match = prefixPattern.exec(text)) !== null) {
    const accountName = `${match[1]} ${match[2]}`.trim();
    if (accountName.length > 3 && accountName.length < 50) {
      accounts.push(accountName);
    }
  }
  
  // 2. Patrón "visitamos/fuimos a X"
  const visitPattern = /(visitamos|fuimos a|estuvimos en|visita a)\s+(el\s+|la\s+)?([\wáéíóúñ\s]+?)(?=\.|,|$|\s+(?:hoy|ayer|y|pidieron))/gi;
  while ((match = visitPattern.exec(text)) !== null) {
    const accountName = match[3].trim();
    if (accountName.length > 2 && accountName.length < 50 && !accounts.includes(accountName)) {
      accounts.push(accountName);
    }
  }
  
  // 3. Si hay contexto de cuentas del usuario, hacer fuzzy matching
  if (context?.userAccounts && context.userAccounts.length > 0) {
    const textLower = text.toLowerCase();
    context.userAccounts.forEach((account: any) => {
      const nameLower = account.name.toLowerCase();
      // Buscar coincidencia exacta o parcial
      if (textLower.includes(nameLower)) {
        if (!accounts.includes(account.name)) {
          accounts.push(account.name);
        }
      } else {
        // Fuzzy matching simple - buscar palabras clave del nombre
        const words = nameLower.split(' ').filter((w: string) => w.length > 3);
        const matchedWords = words.filter((word: string) => textLower.includes(word));
        if (matchedWords.length >= Math.min(2, words.length)) {
          if (!accounts.includes(account.name)) {
            accounts.push(account.name);
          }
        }
      }
    });
  }
  
  // 4. Capitalizar nombres propios detectados sin prefijo
  const properNounPattern = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\b/g;
  while ((match = properNounPattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    // Solo si tiene 2+ palabras o es un nombre conocido
    if (candidate.split(' ').length >= 2 && candidate.length > 5 && candidate.length < 50) {
      // Verificar que no sea una palabra común
      const commonWords = ['Santa Brisa', 'Gemini', 'QuickLog'];
      if (!commonWords.includes(candidate) && !accounts.includes(candidate)) {
        accounts.push(candidate);
      }
    }
  }
  
  if (accounts.length > 0) {
    entities.accounts = [...new Set(accounts)]; // Eliminar duplicados
  }
  
  // PRODUCTOS (SKUs, referencias, Santa Brisa)
  const products: string[] = [];
  
  // SKUs y referencias
  const skuPattern = /SKU-[\w\d-]+|REF-[\w\d-]+/gi;
  const skuMatches = text.match(skuPattern);
  if (skuMatches) {
    products.push(...skuMatches);
  }
  
  // Santa Brisa con variantes
  const santaBrisaPattern = /santa\s+brisa\s+(original|limón|limon|pomelo|naranja|sin\s+alcohol)?/gi;
  while ((match = santaBrisaPattern.exec(text)) !== null) {
    products.push(match[0]);
  }
  
  if (products.length > 0) {
    entities.products = [...new Set(products)];
  }
  
  // CANTIDADES - Mejorado para detectar más formatos
  const amounts: string[] = [];
  const amountPattern = /(\d+)\s*(cajas?|botellas?|units?|unidades?|uds?|kg|litros?|l|€|euros?|packs?)/gi;
  while ((match = amountPattern.exec(text)) !== null) {
    amounts.push(match[0]);
  }
  
  if (amounts.length > 0) {
    entities.amounts = [...new Set(amounts)];
  }
  
  // PERSONAS
  const peoplePattern = /(contactar|llamar|hablar con|reunión con|reunirse con|ver a)\s+([\wáéíóúñ\s]+?)(?=\.|,|$|\s+(?:para|sobre|de))/gi;
  const people: string[] = [];
  while ((match = peoplePattern.exec(text)) !== null) {
    const personName = match[2].trim();
    if (personName.length > 2 && personName.length < 50) {
      people.push(personName);
    }
  }
  if (people.length > 0) {
    entities.people = [...new Set(people)];
  }
  
  return entities;
}

// =================================================================
// TITLE GENERATION
// =================================================================

function generateTitle(input: string, action: QuickLogAction): string {
  // Limpiar y limitar a 60 caracteres
  let title = input.trim();
  
  // Remover frases comunes al inicio
  title = title.replace(/^(recordarme|recuérdame|tengo que|debo|hay que)\s+/i, '');
  
  // Capitalizar primera letra
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Limitar longitud
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  
  // Añadir emoji según acción
  switch (action) {
    case 'CREATE_ALERT':
    case 'CREATE_REMINDER':
      return `⏰ ${title}`;
    case 'CREATE_TASK':
      return `📋 ${title}`;
    case 'CREATE_ORDER':
      return `📦 ${title}`;
    case 'LOG_VISIT':
      return `🏪 ${title}`;
    default:
      return title;
  }
}

// =================================================================
// PROMPT BUILDER (for Gemini API)
// =================================================================

function buildQuickLogPrompt(input: string, context?: any): string {
  return `
Analiza este input de QuickLog y detecta la intención del usuario.

INPUT DEL USUARIO:
"${input}"

${context?.userAccounts ? `
CUENTAS DEL USUARIO:
${context.userAccounts.map((a: any) => `- ${a.name}`).join('\n')}
` : ''}

TAREA:
Identifica:

1. ACCIÓN que quiere realizar:
   - CREATE_ALERT: Crear alerta/aviso urgente
   - CREATE_TASK: Crear tarea pendiente
   - CREATE_REMINDER: Recordatorio futuro
   - CREATE_NOTE: Nota simple
   - CREATE_ORDER: Registrar pedido de venta
   - LOG_VISIT: Registrar visita comercial

2. DEPARTAMENTO: VENTAS, MARKETING, OPS, ALMACEN, CALIDAD, FINANZAS, PRODUCCION, PERSONAL

3. PRIORIDAD: LOW, MEDIUM, HIGH, URGENT

4. FECHAS mencionadas:
   - Fecha de vencimiento (hoy, mañana, en X días, etc.)
   - Fecha de recordatorio

5. ENTIDADES mencionadas:
   - Nombres de cuentas/clientes
   - Productos
   - Cantidades
   - Personas

Responde en formato JSON estructurado con esta forma:
{
  "action": "CREATE_ALERT|CREATE_TASK|CREATE_REMINDER|CREATE_NOTE|CREATE_ORDER|LOG_VISIT",
  "confidence": 0.9,
  "department": "VENTAS",
  "priority": "MEDIUM",
  "title": "Título corto",
  "description": "Descripción completa",
  "dueDate": "ISO date o null",
  "reminderAt": "ISO date o null",
  "entities": {
    "accounts": ["Bar Central"],
    "products": [],
    "amounts": ["5 cajas"],
    "people": []
  },
  "originalInput": "${input}",
  "language": "es"
}
`;
}
