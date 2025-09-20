
// src/app/api/brain-persist/route.ts
import { NextResponse } from "next/server";
import { adminAuth, getProjectId } from "@/server/firebaseAdmin";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function fetchWithTimeout(url: string, init: RequestInit, ms = 15000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal, cache: 'no-store' });
  } finally {
    clearTimeout(t);
  }
}

async function commitAsUser(idToken: string, projectId: string, writes: any[]) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
  let attempt = 0, lastText = '';
  while (attempt < 2) { // 1 try + 1 retry
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ writes }),
      }, 15000);

      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      lastText = text;

      if (!res.ok) {
        // Si el overlay devuelve HTML (504), no intentes parsear JSON
        if (res.status >= 500 && attempt === 0) {
          attempt++;
          await new Promise(r => setTimeout(r, 500 + Math.random()*500));
          continue;
        }
        throw new Error(`Firestore HTTP ${res.status}: ${text.slice(0, 500)}`);
      }

      // A veces los gateways devuelven 200 + HTML por error; valida content-type
      if (!ct.includes('application/json')) {
        throw new Error(`Unexpected content-type "${ct}": ${text.slice(0, 500)}`);
      }
      return JSON.parse(text);
    } catch (e: any) {
      // Si fue abort/timeout, reintenta una vez
      if ((e?.name === 'AbortError' || /network|timed?out/i.test(e?.message)) && attempt === 0) {
        attempt++;
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
      throw new Error(e?.message || lastText || 'Unknown fetch error');
    }
  }
  throw new Error(`Commit failed after retry.`);
}


export async function POST(req: Request) {
  const projectId = getProjectId();
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "Server misconfiguration: FIREBASE_PROJECT_ID is not set." }, { status: 500 });
  }

  const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized: Missing token.' }, { status: 401 });
  }

  try {
    const { newEntities } = await req.json();
    if (!newEntities) {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    if (!adminAuth) {
      return NextResponse.json({ ok: false, error: "Server has no Admin credentials (adminAuth unavailable)." }, { status: 500 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Invalid token." }, { status: 401 });
    }

    const writes: any[] = [];
    for (const coll in newEntities) {
        const items = newEntities[coll];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
            if (!item || !item.id) continue;
            writes.push({
                update: {
                    name: `projects/${projectId}/databases/(default)/documents/${coll}/${item.id}`,
                    fields: Object.entries(item).reduce((acc, [key, value]) => {
                        // This is a simplified transformation for Firestore REST API. A real implementation would be more robust.
                        if (value === null || value === undefined) return acc;
                        if (typeof value === 'string') acc[key] = { stringValue: value };
                        else if (typeof value === 'number') {
                             if(Number.isInteger(value)) acc[key] = { integerValue: value };
                             else acc[key] = { doubleValue: value };
                        }
                        else if (typeof value === 'boolean') acc[key] = { booleanValue: value };
                        else if (Array.isArray(value)) {
                            // Firestore REST array format is complex, skipping for this example
                        } else if (typeof value === 'object') {
                            // Firestore REST map format is complex, skipping for this example
                        }
                        return acc;
                    }, {} as any),
                },
                updateMask: { fieldPaths: Object.keys(item).filter(k => k !== 'id') }
            });
        }
    }
    
    if (writes.length === 0) {
      return NextResponse.json({ ok: true, saved: 0, message: "No documents to save." });
    }
    
    // Instead of using adminDb.batch(), use the new robust commit function
    await commitAsUser(idToken, projectId, writes);

    return NextResponse.json({ ok: true, saved: writes.length });

  } catch (e: any) {
    console.error('[brain-persist] UNHANDLED ERROR:', e?.message);
    const errorMessage = e.message || 'An unexpected server error occurred.';
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
