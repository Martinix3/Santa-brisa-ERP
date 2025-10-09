// src/app/api/enrich-import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface EnrichRequest {
  data: any[];
  sheet: 'users' | 'parties' | 'partyRoles' | 'accounts' | 'items';
  context?: {
    existingUsers?: any[];
    existingParties?: any[];
    existingAccounts?: any[];
  };
}

interface EnrichResponse {
  enrichedData: any[];
  warnings: Array<{
    row: number;
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  suggestions: Array<{
    row: number;
    field: string;
    original: any;
    suggested: any;
    reason: string;
  }>;
  missingRequired: Array<{
    row: number;
    fields: string[];
  }>;
}

const SSOT_RULES = `
# REGLAS DEL SSOT (Single Source of Truth)

## Users
- id: string único (requerido)
- name: string (requerido)
- email: email válido (requerido, único)
- role: "comercial" | "admin" | "ops" | "owner" (requerido)
- active: boolean (requerido)
- createdAt, updatedAt: ISO date string (requerido)

## Parties
- id: string único (requerido)
- name: string nombre comercial (requerido)
- kind: "ORG" | "PERSON" (requerido)
- roles: array de "DISTRIBUTOR" | "CUSTOMER" | "SUPPLIER" | "BRAND" etc (requerido)
- legalName: string razón social (requerido)
- vat: NIF/CIF (requerido si ORG)
- billingAddress: {street, city, zip, province, country} (requerido)
- emails: [{value, isPrimary}] (requerido)
- phones: [{value, isPrimary}] (requerido)

## PartyRoles
- id: string único (requerido)
- partyId: debe existir en parties (requerido)
- userId: debe existir en users (requerido)
- role: "SALESPERSON" para comerciales (requerido)
- isActive: boolean (requerido)
- createdAt: ISO date string (requerido)

## Accounts
- id: string único (requerido)
- name: string (requerido)
- partyId: debe existir en parties (requerido)
- segment: "HORECA" | "RETAIL" | "ONLINE" | "PRIVADA" | "DISTRIBUIDOR" (requerido)
- stage: "POTENCIAL" | "ACTIVA" | "SEGUIMIENTO" | "FALLIDA" (requerido)
- flow: "COLOCACION" | "DIRECTA" (requerido)
- ownerId: debe existir en users (requerido)
- distributorPartyId: requerido si flow=PLACEMENT, vacío si flow=DIRECT
- aliases: array de strings para fuzzy matching (opcional pero recomendado)
- source: "CRM" | "MANUAL" | "SHOPIFY" (requerido)

## Items
- id: string único (requerido)
- sku: string único (requerido)
- name: string (requerido)
- category: "fg" | "raw" | "pack" | "label" | "merch" (requerido)
- uom: "bottle" | "unit" | "case" etc (requerido)
- active, isActive: boolean (requerido)
- unitsPerCase: número para conversión (requerido)
- priceList: {HORECA, RETAIL, DISTRIBUTOR, ONLINE, PRIVADA} para productos fg (requerido)

## REGLAS CRÍTICAS:
1. Si Account tiene flow=PLACEMENT → DEBE tener distributorPartyId
2. Si Account tiene flow=DIRECT → NO debe tener distributorPartyId
3. Segment debe normalizarse: "Horeca" → "HORECA", "horeca" → "HORECA"
4. Stage debe normalizarse: "Activa" → "ACTIVA", "activa" → "ACTIVA"
5. Los IDs deben seguir patrón: acc_nombre, party_nombre, user_nombre
6. Aliases deben generarse automáticamente del nombre
7. Las fechas deben estar en formato ISO: YYYY-MM-DDTHH:mm:ss.sssZ
`;

export async function POST(req: NextRequest) {
  try {
    const body: EnrichRequest = await req.json();
    const { data, sheet, context = {} } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Se requiere un array de datos' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Construir prompt para Gemini
    const prompt = `
Eres un asistente experto en normalización y enriquecimiento de datos para importación a un ERP.

Tu tarea es:
1. NORMALIZAR datos inconsistentes
2. COMPLETAR campos faltantes
3. GENERAR IDs siguiendo convenciones
4. DETECTAR inconsistencias y errores
5. GENERAR aliases automáticos para fuzzy matching
6. VALIDAR relaciones entre entidades

${SSOT_RULES}

## CONTEXTO DEL SISTEMA
Usuarios existentes: ${JSON.stringify(context.existingUsers || [])}
Parties existentes: ${JSON.stringify(context.existingParties || [])}
Accounts existentes: ${JSON.stringify(context.existingAccounts || [])}

## DATOS A ENRIQUECER (${sheet})
${JSON.stringify(data, null, 2)}

## INSTRUCCIONES ESPECÍFICAS:

${getSheetSpecificInstructions(sheet)}

## FORMATO DE RESPUESTA
Debes responder SOLO con un JSON válido con esta estructura:
{
  "enrichedData": [...datos completos y normalizados...],
  "warnings": [
    {
      "row": número_de_fila,
      "field": "campo_con_problema",
      "message": "descripción del problema",
      "severity": "error" | "warning" | "info"
    }
  ],
  "suggestions": [
    {
      "row": número_de_fila,
      "field": "campo",
      "original": valor_original,
      "suggested": valor_sugerido,
      "reason": "por qué se sugiere este cambio"
    }
  ],
  "missingRequired": [
    {
      "row": número_de_fila,
      "fields": ["campo1", "campo2"]
    }
  ]
}

IMPORTANTE: 
- NO inventes datos críticos como emails o teléfonos si no están
- Genera IDs siguiendo el patrón correcto
- Normaliza SIEMPRE los enums (HORECA no horeca, ACTIVA no activa)
- Genera aliases automáticos del nombre
- Valida que las relaciones existan en el contexto
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extraer JSON de la respuesta (puede venir con markdown)
    let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      jsonMatch = responseText.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta de Gemini');
    }

    const enrichedResult: EnrichResponse = JSON.parse(jsonMatch[0].replace(/```json\n?|\n?```/g, ''));

    return NextResponse.json(enrichedResult);
  } catch (error) {
    console.error('Error al enriquecer datos:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar datos con IA',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

function getSheetSpecificInstructions(sheet: string): string {
  switch (sheet) {
    case 'users':
      return `
- Genera IDs con prefijo "us_" seguido del nombre en snake_case
- Normaliza roles a: comercial, admin, ops, owner
- Genera emails corporativos @santabrisa.com si faltan
- Active siempre true por defecto
- Genera createdAt/updatedAt a fecha actual ISO
`;

    case 'parties':
      return `
- Genera IDs con prefijo "party_" seguido del nombre comercial en snake_case
- kind debe ser "ORG" para empresas, "PERSON" para personas físicas
- roles debe ser array: ["DISTRIBUTOR"], ["CUSTOMER"], etc
- Genera VAT/CIF basado en el país (B12345678 formato español)
- Si falta billingAddress, usa datos de la ciudad/zona
- Genera emails y teléfonos genéricos solo si es absolutamente necesario
- people debe tener al menos [{name, role}]
`;

    case 'partyRoles':
      return `
- Genera IDs con prefijo "role_" + número secuencial
- role debe ser "SALESPERSON" para comerciales
- Valida que partyId exista en el contexto de parties
- Valida que userId exista en el contexto de users
- isActive siempre true
- createdAt fecha actual ISO
`;

    case 'accounts':
      return `
- Genera IDs con prefijo "acc_" seguido del nombre en snake_case
- Normaliza segment: HORECA, RETAIL, ONLINE, PRIVADA, DISTRIBUIDOR (MAYÚSCULAS)
- Normaliza stage: POTENCIAL, ACTIVA, SEGUIMIENTO, FALLIDA (MAYÚSCULAS)
- Normaliza flow: PLACEMENT o DIRECT (MAYÚSCULAS)
- CRÍTICO: Si flow=PLACEMENT → distributorPartyId OBLIGATORIO
- CRÍTICO: Si flow=DIRECT → distributorPartyId debe estar vacío
- Genera aliases automáticamente: nombre completo, partes del nombre, apodos comunes
  Ejemplo: "Chez Pepito" → ["chez", "pepito", "chez pepito", "el pepito"]
- source: "MANUAL" por defecto
- Valida que ownerId exista en users
- Valida que distributorPartyId exista en parties si se especifica
`;

    case 'items':
      return `
- Genera IDs con prefijo "item_" seguido del SKU en snake_case
- category: fg, raw, pack, label, merch (minúsculas)
- active e isActive: true
- unitsPerCase es crítico para conversiones automáticas
- Para category=fg, DEBE tener priceList completo:
  {HORECA, RETAIL, DISTRIBUTOR, ONLINE, PRIVADA}
- Genera precios realistas si faltan (basados en costUnit + margen)
`;

    default:
      return '';
  }
}
