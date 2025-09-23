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

export async function callHoldedApi(path: string, initOrMethod?: RequestInit | 'GET'|'POST'|'PATCH'|'DELETE', maybeBody?: any) {
  const init: RequestInit = typeof initOrMethod === 'string'
    ? { method: initOrMethod, body: maybeBody ? JSON.stringify(maybeBody) : undefined }
    : (initOrMethod ?? {});
  const res = await holdedFetch(path, init);
  // muchas llamadas esperan ya el objeto y no Response; devolvemos el JSON
  const ct = res.headers.get('content-type') || '';
  if (res.status === 204) return null;
  return ct.includes('application/json') ? res.json() : res.text();
}
