'use server';
/**
 * @fileOverview Un flow de Genkit que genera HTML para documentos (pedidos, albaranes, etc.).
 *
 * - generateDocumentHtml - La función principal que genera el HTML.
 * - DocumentHtmlInput - El tipo de entrada para la función.
 * - DocumentHtmlOutput - El tipo de retorno de la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { orderTotal } from '@/domain/ssot';

// Define el esquema de entrada usando Zod.
const DocumentHtmlInputSchema = z.object({
  kind: z.enum(['sales_order', 'delivery_note', 'shipping_label'])
    .describe('El tipo de documento a generar.'),
  data: z.any().describe('Un objeto JSON con los datos para rellenar la plantilla. Debe incluir "order", y opcionalmente "account" y "products".'),
});
export type DocumentHtmlInput = z.infer<typeof DocumentHtmlInputSchema>;

export async function generateDocumentHtml(input: DocumentHtmlInput): Promise<string> {
  return generateDocumentHtmlFlow(input);
}


function getPromptForKind(kind: DocumentHtmlInput['kind']) {
    switch (kind) {
        case 'sales_order':
            return `
                Genera el HTML para una confirmación de pedido.
                - Incluye un encabezado con "Confirmación de Pedido" y el ID del pedido (order.id).
                - Muestra los detalles del cliente (account.name, account.address, etc.).
                - Muestra los detalles de Santa Brisa como remitente.
                - Crea una tabla con las líneas del pedido (sku, descripción, cantidad, precio unitario, total).
                - Muestra el total final del pedido.
                - Usa estilos inline de CSS para que se vea profesional y limpio. No uses clases de Tailwind. Usa colores corporativos de Santa Brisa: amarillo (#F7D15F), naranja (#D7713E), y tonos de gris.
            `;
        case 'delivery_note':
            return `
                Genera el HTML para un albarán de entrega.
                - Encabezado: "Albarán de Entrega" y el ID (order.id).
                - Detalles del destinatario (cliente) y remitente (Santa Brisa).
                - Tabla de líneas con: SKU, Descripción, Cantidad y una columna vacía para "Lote/Incidencias". NO incluyas precios.
                - Una sección al final para firma y fecha de recepción.
                - Usa estilos inline de CSS limpios y profesionales.
            `;
        case 'shipping_label':
            return `
                Genera el HTML para una etiqueta de envío de 10x15cm (formato A6).
                - El HTML debe estar contenido en una sola página.
                - Incluye una sección grande y clara para el DESTINATARIO (account.name, account.address, account.city, account.phone).
                - Incluye una sección más pequeña para el REMITENTE (Santa Brisa).
                - Muestra el ID del pedido (order.id) de forma visible.
                - Usa estilos inline de CSS con fuentes grandes y legibles. Sin colores, solo negro sobre blanco. Minimiza los bordes.
            `;
    }
}


const generateDocumentHtmlFlow = ai.defineFlow(
  {
    name: 'generateDocumentHtmlFlow',
    inputSchema: DocumentHtmlInputSchema,
    outputSchema: z.string().describe('El contenido HTML generado.'),
  },
  async (input) => {

    const { kind, data } = input;
    
    // Enrich data with computed values
    if (data.order && data.order.lines) {
        data.order.totalAmount = orderTotal(data.order);
        data.order.lines.forEach((line: any) => {
            const product = data.products?.find((p: any) => p.sku === line.sku);
            line.description = product?.name || line.sku; // Use SKU as fallback description
            line.totalLine = (line.qty || 0) * (line.priceUnit || 0);
        });
    }

    const promptText = getPromptForKind(kind);

    const llmResponse = await ai.generate({
      prompt: `
        ${promptText}
        
        Aquí están los datos en formato JSON. Úsalos para rellenar la plantilla.
        No incluyas los \`\`\`html y \`\`\` wrappers en tu respuesta. Devuelve solo el código HTML.
        
        Datos:
        \`\`\`json
        ${JSON.stringify(data, null, 2)}
        \`\`\`
      `,
      config: { temperature: 0.1 },
    });

    let html = llmResponse.text;
    // Clean up potential markdown wrappers
    if (html.startsWith('```html')) {
        html = html.substring(7);
    }
    if (html.endsWith('```')) {
        html = html.substring(0, html.length - 3);
    }

    return html.trim();
  }
);
