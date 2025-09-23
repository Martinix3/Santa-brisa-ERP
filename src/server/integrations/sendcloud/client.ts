// src/server/integrations/sendcloud/client.ts
import fetch from 'node-fetch';

const SENDCLOUD_API_KEY = process.env.SENDCLOUD_API_KEY;
const SENDCLOUD_API_SECRET = process.env.SENDCLOUD_API_SECRET;
const SENDCLOUD_BASE_URL = 'https://panel.sendcloud.sc/api/v2';

/**
 * A generic client to make API calls to Sendcloud.
 * Handles Basic authentication and error handling.
 * @param path The API endpoint path (e.g., '/parcels').
 * @param method The HTTP method.
 * @param body The request body.
 * @returns The JSON response from the API.
 */
export async function callSendcloudApi(path: string, method: 'GET' | 'POST', body?: any): Promise<any> {
  if (!SENDCLOUD_API_KEY || !SENDCLOUD_API_SECRET) {
    throw new Error('Sendcloud API credentials are not set in environment variables.');
  }

  const credentials = Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString('base64');

  const response = await fetch(`${SENDCLOUD_BASE_URL}${path}`, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Sendcloud API Error: ${response.status} ${path}`, errorBody);
    throw new Error(`Sendcloud API request failed with status ${response.status}: ${errorBody}`);
  }

  // Sendcloud devuelve 204 No Content para algunas operaciones exitosas sin cuerpo.
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
