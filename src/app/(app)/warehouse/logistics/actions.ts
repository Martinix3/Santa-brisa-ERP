
'use server';
import { ai } from '@/ai';
import { getServerData } from '@/lib/dataprovider/server';
import { orderTotal } from '@/lib/sb-core';

/**
 * Generates packing slip content for a given shipment using AI.
 * This simulates the full backend process within a Server Action.
 * @param shipmentId The ID of the shipment.
 * @returns An object with the generated text content and a mock PDF URL.
 */
export async function generatePackingSlip(shipmentId: string): Promise<{ content?: string; url?: string; error?: string }> {
  console.log(`[Server Action] Received request to generate packing slip for shipment: ${shipmentId}`);

  try {
    // 1. Fetch all necessary data from the database
    const data = await getServerData();
    const shipment = data.shipments.find(s => s.id === shipmentId);
    if (!shipment) throw new Error('Shipment not found.');

    const order = data.ordersSellOut.find(o => o.id === shipment.orderId);
    if (!order) throw new Error('Associated order not found.');
    
    const account = data.accounts.find(a => a.id === order.accountId);
    if (!account) throw new Error('Associated account not found.');

    const party = data.parties.find(p => p.id === account.partyId);

    const promptData = {
        shipmentId: shipment.id,
        orderId: order.id,
        customer: {
            name: shipment.customerName,
            address: `${shipment.addressLine1}, ${shipment.city}, ${shipment.postalCode}, ${shipment.country}`,
            type: account.type,
        },
        lines: shipment.lines.map(line => ({
            sku: line.sku,
            name: line.name,
            qty: line.qty,
        })),
        notes: shipment.notes || order.notes,
    };

    // 2. Call Gemini (via Genkit) to generate intelligent content
    console.log('[Server Action] Calling Genkit to generate packing slip content...');
    const { text: generatedContent } = await ai.generate({
        prompt: `
            You are a logistics assistant for Santa Brisa, a premium beverage company.
            Your task is to generate the content for a packing slip based on the provided shipment data.
            The output should be in plain text, using markdown for basic formatting.

            Follow these instructions:
            1.  Start with a clear header: "ALBARÁN DE ENTREGA / PACKING SLIP".
            2.  Include Shipment ID and Order ID.
            3.  List the customer's shipping details.
            4.  List all items with SKU, Description, and Quantity.
            5.  Based on the items, add a "MANIPULACIÓN:" note (e.g., "FRÁGIL", "MANTENER EN FRÍO"). Assume all beverages are fragile.
            6.  Write a friendly, brief thank-you note to the customer. Personalize it slightly based on their account type (e.g., 'HORECA', 'RETAIL').
            7.  If there are any notes in the order, include them under an "OBSERVACIONES:" section.
            
            Here is the shipment data in JSON format:
            ${JSON.stringify(promptData, null, 2)}
        `,
        model: 'googleai/gemini-2.5-flash',
    });

    if (!generatedContent) {
        throw new Error('AI failed to generate content.');
    }

    console.log(`[Server Action] Successfully generated content for ${shipmentId}.`);
    
    // 3. Return the generated content and a mock PDF URL
    const mockUrl = `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;
    return { content: generatedContent, url: mockUrl };

  } catch (e: any) {
    console.error(`[Server Action] Failed to generate slip for ${shipmentId}:`, e);
    return { error: e.message || "An unknown error occurred." };
  }
}
