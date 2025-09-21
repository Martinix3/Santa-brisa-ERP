
'use server';
import { ai } from '@/ai';
import { getServerData } from '@/lib/dataprovider/server';
import puppeteer from 'puppeteer';

/**
 * Generates a PDF packing slip for a given shipment using AI and Puppeteer.
 * @param shipmentId The ID of the shipment.
 * @returns An object with the PDF data URI or an error message.
 */
export async function generatePackingSlip(shipmentId: string): Promise<{ pdfDataUri?: string; error?: string }> {
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

    const promptData = {
        shipmentId: shipment.id,
        orderId: order.id,
        customer: {
            name: shipment.customerName,
            address: `${shipment.addressLine1 || ''}, ${shipment.city}, ${shipment.postalCode || ''}, ${shipment.country || ''}`,
            type: account.type,
        },
        lines: shipment.lines.map(line => ({
            sku: line.sku,
            name: line.name,
            qty: line.qty,
        })),
        notes: shipment.notes || order.notes,
    };

    // 2. Call Genkit to generate HTML content
    console.log('[Server Action] Calling Genkit to generate packing slip HTML...');
    const { text: generatedHtml } = await ai.generate({
        prompt: `
            You are a logistics assistant for Santa Brisa, a premium beverage company.
            Your task is to generate the HTML content for a packing slip based on the provided shipment data.
            The output should be a single, clean HTML document with inline CSS for styling. Use a professional and minimalist design.

            Follow these instructions:
            1.  Use a simple HTML structure (<html>, <head>, <body>).
            2.  Apply styles using a <style> tag in the <head>. Use a clean font like Arial or Helvetica.
            3.  Create a header with the Santa Brisa logo (use a placeholder: https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726) and the title "ALBARÁN DE ENTREGA / PACKING SLIP".
            4.  Display Shipment ID and Order ID clearly.
            5.  List the customer's shipping details.
            6.  Create a table for the items with columns: SKU, Descripción, and Cantidad.
            7.  Based on the items, add a "MANIPULACIÓN:" note (e.g., "FRÁGIL", "MANTENER EN FRÍO"). Assume all beverages are fragile.
            8.  If there are any notes in the order, include them under an "OBSERVACIONES:" section.
            
            Here is the shipment data in JSON format:
            ${JSON.stringify(promptData, null, 2)}
        `,
        model: 'googleai/gemini-2.5-flash',
    });

    if (!generatedHtml) {
        throw new Error('AI failed to generate HTML content.');
    }
    
    // Clean potential markdown backticks from the AI response
    const cleanHtml = generatedHtml.replace(/```html/g, '').replace(/```/g, '');

    // 3. Use Puppeteer to convert HTML to PDF
    console.log('[Server Action] Launching Puppeteer to generate PDF...');
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    });
    const page = await browser.newPage();
    await page.setContent(cleanHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    console.log('[Server Action] Puppeteer finished generating PDF buffer.');

    // 4. Convert to Base64 Data URI and return
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;
    
    console.log(`[Server Action] Successfully generated PDF for ${shipmentId}.`);
    return { pdfDataUri };

  } catch (e: any) {
    console.error(`[Server Action] Failed to generate slip for ${shipmentId}:`, e);
    return { error: e.message || "An unknown error occurred." };
  }
}
