export const HOLDED_BASE = process.env.HOLDED_API_BASE ?? 'https://api.holded.com/api/invoicing/v1';

export async function holdedFetch(path: string, init: RequestInit = {}) {
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    key: process.env.HOLDED_API_KEY!,
    ...(init.headers || {}),
  };
  const res = await fetch(`${HOLDED_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Holded ${init.method ?? 'GET'} ${path} -> ${res.status}: ${body}`);
  }
  return res;
}
