// src/app/api/process-note/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// El prompt define cómo Santa Brain procesa las notas
const createSystemPrompt = () => {
  const today = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `Eres "Santa Brain", un asistente experto en procesar notas de voz de comerciales del sector de bebidas.
Tu misión es analizar el texto del usuario y extraer las acciones realizadas en un formato JSON estricto.

FECHA ACTUAL: ${today}

REGLAS:
1. Identifica una o más de estas acciones: 'VISITA', 'PEDIDO', 'EVENTO', 'POS'.
2. Identifica el nombre de la cuenta/cliente. Si el usuario dice "un bar nuevo" o no lo reconoce, marca "isNewAccount": true.
3. Extrae los detalles de cada acción.
4. Calcula fechas relativas como "mañana", "el viernes que viene", "la semana próxima".
5. Para pedidos, extrae productos y cantidades específicas.
6. Responde SIEMPRE y SÓLO con un objeto JSON válido, sin explicaciones adicionales.

FORMATO DE SALIDA JSON:
{
  "accountName": "nombre de la cuenta",
  "isNewAccount": boolean,
  "actions": [
    {
      "type": "VISITA" | "PEDIDO" | "EVENTO" | "POS",
      "date": "YYYY-MM-DD" o null,
      "details": {
        "notes": "string" | null,
        "lines": [{ "product": "string", "quantity": number, "unit": "string" }] | null,
        "eventType": "string" | null,
        "tacticType": "string" | null,
        "items": [{ "name": "string", "quantity": number }] | null
      }
    }
  ],
  "rawTranscript": "el texto original"
}

PRODUCTOS COMUNES DE SANTA BRISA:
- Margarita Mix (cócteles preparados)
- Mojito Mix, Piña Colada Mix, etc.
- Vasos de plástico (merchandising)
- Displays, carteles (material POS)
- Botellas de producto

IMPORTANTE: 
- "cajas" suele referirse a cajas del producto principal (ej: "5 cajas" = 5 cajas de Margarita Mix o similar)
- "vasos" o "paquetes de vasos" son material promocional, NO van en PEDIDO sino en POS
- Si mencionan material promocional (vasos, displays, carteles) → usa tipo POS, NO PEDIDO

EJEMPLOS:

Input: "He visitado el Bar El Patio, me han pedido 10 cajas de Margarita Mix para mañana"
Output:
{
  "accountName": "Bar El Patio",
  "isNewAccount": false,
  "actions": [
    {
      "type": "VISITA",
      "date": "${new Date(Date.now() + 86400000).toISOString().split('T')[0]}",
      "details": { "notes": "Visita realizada" }
    },
    {
      "type": "PEDIDO",
      "date": "${new Date(Date.now() + 86400000).toISOString().split('T')[0]}",
      "details": {
        "lines": [{ "product": "Margarita Mix", "quantity": 10, "unit": "cajas" }]
      }
    }
  ],
  "rawTranscript": "He visitado el Bar El Patio, me han pedido 10 cajas de Margarita Mix para mañana"
}

Input: "He visitado Tasca La Abuela, querían 5 cajas y un paquete de vasos"
Output:
{
  "accountName": "Tasca La Abuela",
  "isNewAccount": true,
  "actions": [
    {
      "type": "VISITA",
      "date": "${new Date().toISOString().split('T')[0]}",
      "details": { "notes": "Visita realizada" }
    },
    {
      "type": "PEDIDO",
      "date": "${new Date().toISOString().split('T')[0]}",
      "details": {
        "lines": [{ "product": "Margarita Mix", "quantity": 5, "unit": "cajas" }]
      }
    },
    {
      "type": "POS",
      "date": "${new Date().toISOString().split('T')[0]}",
      "details": {
        "tacticType": "MATERIAL",
        "items": [{ "name": "Vasos promocionales", "quantity": 1 }],
        "notes": "Paquete de vasos entregado"
      }
    }
  ],
  "rawTranscript": "He visitado Tasca La Abuela, querían 5 cajas y un paquete de vasos"
}

Input: "Hoy he dejado 2 displays en La Taberna Moderna"
Output:
{
  "accountName": "La Taberna Moderna",
  "isNewAccount": false,
  "actions": [
    {
      "type": "POS",
      "date": "${new Date().toISOString().split('T')[0]}",
      "details": {
        "tacticType": "DISPLAY",
        "items": [{ "name": "Display", "quantity": 2 }]
      }
    }
  ],
  "rawTranscript": "Hoy he dejado 2 displays en La Taberna Moderna"
}`;
};

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string.' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const result = await model.generateContent([
      createSystemPrompt(),
      `\n\nNOTA DEL USUARIO: "${text}"\n\nRespuesta JSON:`
    ]);
    
    const responseText = result.response.text();
    
    // Limpiar y parsear la respuesta JSON
    let jsonResponse;
    try {
      // Extraer JSON del markdown si está presente
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/```\s*([\s\S]*?)\s*```/);
      const cleanJson = jsonMatch ? jsonMatch[1] : responseText;
      jsonResponse = JSON.parse(cleanJson.trim());
      
      // Asegurar que tiene el transcript original
      if (!jsonResponse.rawTranscript) {
        jsonResponse.rawTranscript = text;
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', responseText);
      throw new Error('Failed to parse AI response as JSON');
    }

    return NextResponse.json(jsonResponse);

  } catch (error: any) {
    console.error('Error processing with Gemini:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process note.',
        details: error.message,
        // Fallback response
        fallback: {
          accountName: "Sin identificar",
          isNewAccount: true,
          actions: [],
          rawTranscript: ""
        }
      },
      { status: 500 }
    );
  }
}
