// src/lib/santa-brain/gemini-client.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export type SantaBrainIntention = 
  | 'CREAR_PEDIDO'
  | 'CREAR_POS_TACTIC'
  | 'AGENDAR_TAREA'
  | 'CREAR_CUENTA'
  | 'REGISTRAR_INTERACCION'
  | 'RECHAZAR_CLIENTE'; // Nueva intención para "cliente dice que no"

export type SantaBrainResponse = {
  intencion: SantaBrainIntention;
  confianza: number;
  entidades: {
    cuenta: string | null;
    cuenta_confianza?: number; // Score del fuzzy matching
    producto?: 'Santa Brisa' | 'Santa Brisa 750ml' | null;
    cantidad?: number | null;
    unidad?: 'botellas' | 'cajas'; // Nueva unidad para conversión
    pos_material?: string | string[] | null; // Puede ser array
    pos_evento?: string | null;
    fecha?: string | null;
    nota?: string | null;
    razon_rechazo?: string | null;
  };
  aclaracion_necesaria?: string | null;
  respuesta_usuario: string;
};

export type SantaBrainContext = {
  userId: string;
  userName: string;
  userLocation?: {
    city?: string;
    province?: string;
  };
  // Cuentas del distribuidor del comercial
  myAccounts: Array<{ 
    id: string; 
    name: string; 
    segment?: string;
    aliases?: string[];
  }>;
  // Catálogo de venta (Santa Brisa)
  salesCatalog: {
    id: string;
    name: string;
    sku: string;
    unitsPerCase: number;
    priceList: Record<string, number>;
  };
  // Catálogo POS
  posCatalog: Array<{
    name: string;
    type: string;
  }>;
};

function buildSystemPrompt(context: SantaBrainContext): string {
  const today = new Date().toISOString().split('T')[0];
  const { myAccounts, salesCatalog, posCatalog } = context;
  
  return `Eres Santa Brain para ${context.userName}.

📋 TUS CUENTAS (${myAccounts.length} del distribuidor):
${myAccounts.slice(0, 50).map(a => 
  `- "${a.name}"${a.accountType ? ` [${a.accountType}]` : ''}${a.aliases?.length ? ` (también: ${a.aliases.join(', ')})` : ''}`
).join('\n')}
${myAccounts.length > 50 ? `... y ${myAccounts.length - 50} más` : ''}

📦 CATÁLOGO DE VENTA:
- "${salesCatalog.name}" (único producto de venta)
  • SKU: ${salesCatalog.sku}
  • 1 caja = ${salesCatalog.unitsPerCase} botellas
  • Precios por segmento:
${Object.entries(salesCatalog.priceList).map(([seg, price]) => 
  `    - ${seg}: ${price}€/botella`
).join('\n')}

🎁 CATÁLOGO POS (material promocional, NO es venta):
${posCatalog.map(p => `- ${p.name}`).join('\n')}

REGLAS DE MATCHING:
1. Busca la cuenta más similar de TUS CUENTAS
   - Tolera errores: "central" → "Bar Central"
   - Tolera variaciones: "el sol" → "Tienda El Sol"
2. Si mencionan cantidad sin producto → es Santa Brisa
3. Si mencionan "cajas" → convertir a botellas
4. Vasos/cubos/displays/banderolas → POS (no venta)
5. Cliente dice "no" → RECHAZAR_CLIENTE
6. Hoy: ${today}

INTENCIONES:
- CREAR_PEDIDO: Pedido confirmado de Santa Brisa
- CREAR_POS_TACTIC: Material promocional (vasos, displays, etc)
- AGENDAR_TAREA: Seguimiento futuro
- CREAR_CUENTA: Cuenta nueva que no está en la lista
- REGISTRAR_INTERACCION: Solo visita, sin pedido ni POS
- RECHAZAR_CLIENTE: Cliente no interesado

JSON (sin markdown):
{
  "intencion": "CREAR_PEDIDO",
  "confianza": 95,
  "entidades": {
    "cuenta": "nombre más similar de tus cuentas",
    "cuenta_confianza": 85,
    "producto": "Santa Brisa 750ml" | null,
    "cantidad": 5,
    "unidad": "botellas" | "cajas",
    "fecha": "YYYY-MM-DD" | null,
    "nota": "detalles adicionales",
    "pos_material": ["vasos", "displays"] | null,
    "razon_rechazo": "..." | null
  },
  "respuesta_usuario": "✅ Confirmación clara"
}`;
}

export async function processSantaBrainInput(
  userInput: string,
  context: SantaBrainContext
): Promise<SantaBrainResponse> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const systemPrompt = buildSystemPrompt(context);
  const fullPrompt = `${systemPrompt}\n\nINPUT DEL USUARIO: "${userInput}"`;
  
  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Limpiar respuesta (remover markdown si existe)
    const cleanText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanText) as SantaBrainResponse;
    
    return parsed;
  } catch (error) {
    console.error('Error processing Santa Brain input:', error);
    throw new Error('No pude procesar tu petición. Intenta reformularla.');
  }
}
