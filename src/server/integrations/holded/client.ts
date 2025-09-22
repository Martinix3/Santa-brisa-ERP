// src/server/integrations/holded/client.ts
import fetch from 'node-fetch';

const HOLDED_API_KEY = process.env.HOLDED_API_KEY;
const HOLDED_BASE_URL = 'https://api.holded.com/api';

/**
 * A generic client to make API calls to Holded.
 * Handles authentication and basic error handling.
 * @param path The API endpoint path (e.g., '/invoicing/v1/documents/invoice').
 * @param method The HTTP method ('GET', 'POST', etc.).
 * @param body The request body for 'POST' or 'PUT' requests.
 * @returns The JSON response from the API.
 */
export async function callHoldedApi(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any): Promise<any> {
  if (!HOLDED_API_KEY) {
    throw new Error('HOLDED_API_KEY environment variable is not set.');
  }

  const response = await fetch(`${HOLDED_BASE_URL}${path}`, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'key': HOLDED_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Holded API Error: ${response.status} ${path}`, errorBody);
    throw new Error(`Holded API request failed with status ${response.status}: ${errorBody}`);
  }

  return response.json();
}
