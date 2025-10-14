// src/features/quicklog/actions/process-message.ts
"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchContacts } from '@/lib/algolia/search';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface Action {
  type: 'PEDIDO' | 'EVENTO' | 'POS' | 'VISITA' | 'RECORDATORIO' | 'OTRO';
  what: string; // Descripción breve
  details: string;
  date?: string;
  scheduledDate?: string; // Fecha programada/agendada
  time?: string; // Hora (HH:MM)
}

export interface ProcessedMessage {
  accountName: string;
  accountId?: string;
  isNewAccount: boolean;
  actions: Action[]; // Múltiples acciones
  rawText: string;
}

export async function processMessage(
  text: string,
  userId: string
): Promise<ProcessedMessage> {
  
  try {
    // 1. Procesar con Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1, // Más determinístico
        maxOutputTokens: 500,
      }
    });
    
    // Fecha actual para calcular fechas relativas
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const prompt = `Extrae datos estructurados del siguiente mensaje de ventas.

FECHA HOY: ${today}

MENSAJE: "${text}"

Responde SOLO con un objeto JSON válido (sin markdown, sin explicaciones):
{
  "accountName": "nombre (SIN artículos ni 'bar'/'restaurante')",
  "actions": [
    {
      "type": "PEDIDO",
      "what": "4 cajas",
      "details": "",
      "date": null,
      "scheduledDate": null
    }
  ]
}

REGLAS CRÍTICAS:

1. **accountName**: Quita "el", "la", "los", "las", "bar", "restaurante", "cafetería"

2. **PEDIDO**:
   - "what": SOLO cantidad + unidad ("4 cajas", "12 botellas")
   - NO menciones producto (solo hay Santa Brisa)
   - Ejemplos: "4 cajas" → "what": "4 cajas"

3. **VISITA**:
   - "what": Resumen breve
   - "scheduledDate": Si dice "volver en X días/semanas" → calcular fecha
   - Ejemplo: "volver en una semana" → scheduledDate: 7 días desde hoy

4. **EVENTO**:
   - "what": Tipo de evento ("mariachis", "degustación", "formación")
   - "scheduledDate": Fecha del evento si se menciona
   - Ejemplo: "evento con mariachis el 6 de julio" → what: "mariachis", scheduledDate: "2025-07-06"

5. **POS** (Material promocional):
   - "what": Tipo de material ("Menú", "Cartel", "Vasos", "Stand")
   - "details": Descripción adicional

TIPOS: PEDIDO, EVENTO, POS, VISITA, RECORDATORIO, OTRO

Ejemplos:
- "4 cajas" → {"accountName":"","actions":[{"type":"PEDIDO","what":"4 cajas","details":"","date":null,"scheduledDate":null}]}
- "visita, volver en una semana" → {"accountName":"","actions":[{"type":"VISITA","what":"Visita","details":"Volver en una semana","date":null,"scheduledDate":"2025-10-21"}]}
- "evento con mariachis el 6 de julio" → {"accountName":"","actions":[{"type":"EVENTO","what":"mariachis","details":"","date":null,"scheduledDate":"2025-07-06"}]}
- "nos añade en sus cartas" → {"accountName":"","actions":[{"type":"POS","what":"Menú","details":"Añadido a carta","date":null,"scheduledDate":null}]}

Procesa: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('[QuickLog] Gemini response:', response);
    
    // Limpiar markdown si existe
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```\s*/g, '');
    }
    
    // Intentar extraer JSON
    let parsed;
    try {
      // Primero intentar parsear directo
      parsed = JSON.parse(cleanResponse);
    } catch {
      // Si falla, buscar JSON entre el texto
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    }
    
    // Validar estructura mínima
    // accountName puede estar vacío para recordatorios sin cuenta
    if (parsed.accountName === undefined || !Array.isArray(parsed.actions)) {
      throw new Error('Invalid JSON structure');
    }
    
    // 2. Buscar cuenta en Algolia (contacts)
    let accountId: string | undefined;
    let isNewAccount = true;
    
    if (parsed.accountName && parsed.accountName.trim()) {
      try {
        console.log('[QuickLog] Buscando en Algolia:', parsed.accountName);
        const results = await searchContacts(parsed.accountName.trim(), {
          // NO filtrar por userId para encontrar cualquier cuenta
          hitsPerPage: 5
        });
        
        console.log('[QuickLog] Resultados Algolia:', results.length);
        
        if (results.length > 0) {
          accountId = results[0].id;
          isNewAccount = false;
          console.log('[QuickLog] ✅ Cuenta encontrada:', {
            id: accountId,
            name: results[0].displayName,
            isNew: isNewAccount
          });
        } else {
          console.log('[QuickLog] ⚠️ No se encontró cuenta para:', parsed.accountName);
        }
      } catch (error) {
        console.error('[QuickLog] Error buscando cuenta en Algolia:', error);
        // Continuar sin accountId
      }
    }
    
    return {
      accountName: parsed.accountName || '',
      accountId,
      isNewAccount,
      actions: parsed.actions || [{
        type: 'OTRO',
        what: text.substring(0, 50),
        details: text,
        date: undefined
      }],
      rawText: text
    };
    
  } catch (error: any) {
    console.error('Error procesando mensaje:', error);
    
    // Fallback: retornar estructura básica
    return {
      accountName: '',
      isNewAccount: true,
      actions: [{
        type: 'OTRO',
        what: text.substring(0, 50),
        details: text,
        date: undefined
      }],
      rawText: text
    };
  }
}
