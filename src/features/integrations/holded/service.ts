
// src/features/integrations/holded/service.ts
const HOLDED_API_URL = "https://api.holded.com/api";

type HoldedInvoice = {
  id: string;
  contactName: string;
  total: number;
  date: number; // timestamp
  // ...y muchos otros campos
};

/**
 * Fetches the last 50 invoices from Holded.
 * @param apiKey The Holded API key.
 * @returns A promise that resolves to an array of invoices.
 */
export async function fetchInvoices(apiKey: string): Promise<HoldedInvoice[]> {
  const headers = {
    "Accept": "application/json",
    "key": apiKey,
  };

  try {
    const response = await fetch(`${HOLDED_API_URL}/invoicing/v1/documents/invoice?limit=50`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      // Intenta leer el cuerpo del error para dar más contexto
      const errorBody = await response.text();
      console.error("Holded API Error:", response.status, errorBody);
      throw new Error(`Error ${response.status} from Holded API: ${errorBody}`);
    }

    const invoices = await response.json();
    return invoices as HoldedInvoice[];
  } catch (error: any) {
    console.error("Failed to fetch invoices from Holded:", error);
    throw new Error(`Failed to fetch from Holded: ${error.message}`);
  }
}
