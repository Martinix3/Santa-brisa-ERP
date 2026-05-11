/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/quicklog/utils/process-quicklog.ts
'use server';

import { analyzeQuickLogIntent, type QuickLogIntent } from '@/server/gemini/analyzers/quicklog-analyzer';
import type { ProcessedSummary } from '../components/QuickLogConfirmation';

/**
 * Procesa notas de QuickLog y las convierte al formato de resumen
 */
export async function processQuickLogNotes(
  notes: string,
  userId: string,
  accountId?: string,
  context?: {
    userAccounts?: any[];
    recentInteractions?: any[];
  }
): Promise<ProcessedSummary> {
  // 1. Analizar según flag (por defecto sin IA)
  const intent = await analyzeQuickLogIntent(notes, userId, context);
  const usedAI = process.env.QUICKLOG_AI === 'true' && process.env.USE_GEMINI !== 'false';

  // 2. Buscar cuenta existente si Gemini detectó una
  let matchedAccount: any = null;
  if (intent.entities.accounts && intent.entities.accounts.length > 0 && context?.userAccounts) {
    matchedAccount = findMatchingAccount(intent.entities.accounts[0], context.userAccounts);
  }

  // 3. Convertir a formato de resumen
  const summary: ProcessedSummary = {
    source: usedAI ? 'AI' : 'RULES',
    account: {
      id: matchedAccount?.id || accountId,
      name: matchedAccount?.name || extractAccountName(intent, context),
      isNew: !matchedAccount && !accountId && hasAccountMention(intent),
      segment: matchedAccount?.segment || detectSegment(intent),
    },
    actions: convertIntentToActions(intent),
    confidence: Math.round(intent.confidence * 100),
    warnings: generateWarnings(intent),
  };

  return summary;
}

/**
 * Extrae nombre de cuenta del intent y busca coincidencias en cuentas existentes
 */
function extractAccountName(intent: QuickLogIntent, context?: any): string {
  // Si hay cuenta en entidades detectadas por Gemini
  if (intent.entities.accounts && intent.entities.accounts.length > 0) {
    const detectedName = intent.entities.accounts[0];
    
    // Buscar coincidencia en cuentas existentes (fuzzy matching)
    if (context?.userAccounts && context.userAccounts.length > 0) {
      const match = findMatchingAccount(detectedName, context.userAccounts);
      if (match) {
        return match.name; // Usar nombre exacto de la cuenta existente
      }
    }
    
    return detectedName; // Usar nombre detectado si no hay coincidencia
  }

  // Si hay contexto de cuentas del usuario
  if (context?.userAccounts && context.userAccounts.length > 0) {
    return context.userAccounts[0].name;
  }

  return 'Cliente no especificado';
}

/**
 * Busca cuenta existente que coincida con el nombre detectado
 */
function findMatchingAccount(detectedName: string, accounts: any[]): any | null {
  const detectedLower = detectedName.toLowerCase().trim();
  
  // 1. Coincidencia exacta
  let match = accounts.find(acc => 
    acc.name.toLowerCase().trim() === detectedLower
  );
  if (match) return match;
  
  // 2. Coincidencia parcial (contiene)
  match = accounts.find(acc => 
    acc.name.toLowerCase().includes(detectedLower) ||
    detectedLower.includes(acc.name.toLowerCase())
  );
  if (match) return match;
  
  // 3. Fuzzy matching por palabras
  const detectedWords = detectedLower.split(' ').filter(w => w.length > 2);
  match = accounts.find(acc => {
    const accountWords = acc.name.toLowerCase().split(' ').filter((w: string) => w.length > 2);
    const matchedWords = detectedWords.filter(dw => 
      accountWords.some((aw: string) => aw.includes(dw) || dw.includes(aw))
    );
    return matchedWords.length >= Math.min(2, Math.min(detectedWords.length, accountWords.length));
  });
  
  return match || null;
}

/**
 * Verifica si se menciona una cuenta y si es nueva
 */
function hasAccountMention(intent: QuickLogIntent): boolean {
  return !!(intent.entities.accounts && intent.entities.accounts.length > 0);
}

/**
 * Detecta segmento basado en keywords
 */
function detectSegment(intent: QuickLogIntent): string | undefined {
  const text = (intent.originalInput || intent.description || '').toLowerCase();
  
  if (text.includes('bar') || text.includes('restaurante') || text.includes('hotel')) {
    return 'HORECA';
  }
  if (text.includes('tienda') || text.includes('retail')) {
    return 'RETAIL';
  }
  if (text.includes('distribuidor')) {
    return 'DISTRIBUIDOR';
  }
  
  return undefined;
}

/**
 * Convierte QuickLogIntent a acciones del resumen
 */
function convertIntentToActions(intent: QuickLogIntent): ProcessedSummary['actions'] {
  const actions: ProcessedSummary['actions'] = [];

  switch (intent.action) {
    case 'LOG_VISIT':
      actions.push({
        type: 'VISITA',
        date: intent.dueDate || new Date().toISOString(),
        details: {
          notes: intent.description || intent.title,
        },
      });
      break;

    case 'CREATE_ORDER':
      // Extraer líneas de pedido si hay cantidades
      const lines = extractOrderLines(intent);
      actions.push({
        type: 'PEDIDO',
        date: intent.dueDate || new Date().toISOString(),
        details: {
          lines,
          estimatedTotal: calculateEstimatedTotal(lines),
          notes: intent.description,
          flow: 'PLACEMENT',
        },
      });
      break;

    case 'CREATE_TASK':
    case 'CREATE_REMINDER':
      actions.push({
        type: 'EVENTO',
        date: intent.dueDate || new Date().toISOString(),
        details: {
          title: intent.title,
          description: intent.description,
        },
      });
      break;

    case 'CREATE_NOTE':
      actions.push({
        type: 'NOTA',
        date: new Date().toISOString(),
        details: {
          notes: intent.description || intent.title,
        },
      });
      break;
  }

  // Detectar POS si se menciona
  if (intent.originalInput.toLowerCase().includes('pos') || 
      intent.originalInput.toLowerCase().includes('instalamos')) {
    actions.push({
      type: 'POS',
      date: new Date().toISOString(),
      details: {
        location: extractPOSLocation(intent.originalInput),
        notes: 'POS instalado',
      },
    });
  }

  return actions;
}

/**
 * Extrae líneas de pedido de las entidades
 */
function extractOrderLines(intent: QuickLogIntent): Array<{
  itemName: string;
  qty: number;
  uom: string;
}> {
  const lines: Array<{ itemName: string; qty: number; uom: string }> = [];

  if (!intent.entities.amounts) return lines;

  // Parsear cantidades como "12 cajas", "6 botellas"
  intent.entities.amounts.forEach(amount => {
    const match = amount.match(/(\d+)\s*(cajas?|botellas?|unidades?|units?)/i);
    if (match) {
      const qty = parseInt(match[1]);
      const uom = match[2].toLowerCase().includes('caja') ? 'case' :
                  match[2].toLowerCase().includes('botella') ? 'bottle' : 'unit';
      
      // Intentar detectar producto
      const productName = detectProductName(intent.originalInput, intent.entities.products);
      
      lines.push({
        itemName: productName,
        qty,
        uom,
      });
    }
  });

  return lines;
}

/**
 * Detecta nombre de producto
 */
function detectProductName(text: string, products?: string[]): string {
  if (products && products.length > 0) {
    return products[0];
  }

  // Buscar "Santa Brisa" + variante
  const santaBrisaMatch = text.match(/santa brisa\s+(original|limón|pomelo|naranja)/i);
  if (santaBrisaMatch) {
    return `Santa Brisa ${santaBrisaMatch[1]}`;
  }

  if (text.toLowerCase().includes('santa brisa')) {
    return 'Santa Brisa Original';
  }

  return 'Producto no especificado';
}

/**
 * Calcula total estimado
 */
function calculateEstimatedTotal(lines: Array<{ qty: number; uom: string }>): number {
  // Precio estimado por unidad
  const pricePerCase = 15.50;
  const pricePerBottle = 1.50;

  let total = 0;
  lines.forEach(line => {
    if (line.uom === 'case') {
      total += line.qty * pricePerCase;
    } else if (line.uom === 'bottle') {
      total += line.qty * pricePerBottle;
    }
  });

  return total;
}

/**
 * Extrae ubicación de POS
 */
function extractPOSLocation(text: string): string {
  const locationMatch = text.match(/en (la )?(entrada|salida|barra|terraza|recepción)/i);
  if (locationMatch) {
    return locationMatch[2];
  }
  return 'No especificada';
}

/**
 * Genera warnings basados en el análisis
 */
function generateWarnings(intent: QuickLogIntent): string[] {
  const warnings: string[] = [];

  // Baja confianza
  if (intent.confidence < 0.7) {
    warnings.push('Confianza baja en el análisis. Revisa los detalles.');
  }

  // Sin cuenta detectada
  if (!intent.entities.accounts || intent.entities.accounts.length === 0) {
    warnings.push('No se detectó ningún cliente. Especifica uno manualmente.');
  }

  // Pedido sin cantidades
  if (intent.action === 'CREATE_ORDER' && 
      (!intent.entities.amounts || intent.entities.amounts.length === 0)) {
    warnings.push('Pedido sin cantidades detectadas. Verifica los detalles.');
  }

  // Sin fecha para tareas/recordatorios
  if ((intent.action === 'CREATE_TASK' || intent.action === 'CREATE_REMINDER') && 
      !intent.dueDate) {
    warnings.push('No se detectó fecha. Se usará la fecha actual.');
  }

  return warnings;
}
