// src/server/integrations/holded/client.ts
import fetch from 'node-fetch';
const BASE = 'https://api.holded.com/api';
const KEY = process.env.HOLDED_API_KEY!;

export async function callHoldedApi(path: string, method: 'GET'|'POST'|'PUT'|'DELETE', body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Accept':'application/json', 'Content-Type':'application/json', 'X-Api-Key': KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Holded ${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
