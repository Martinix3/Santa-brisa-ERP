
// src/app/api/brain-persist/route.ts
"use server";

import { NextResponse } from "next/server";
import { getProjectId } from "@/server/firebaseAdmin";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FirestoreWrite {
  update: {
    name: string;
    fields: any;
  };
  currentDocument?: {
    exists: boolean;
  };
}

// Helper to convert a JS object to Firestore's mapValue format
function toFirestoreValue(value: any): { [key: string]: any } {
  const type = typeof value;
  if (value === null || value === undefined) return { nullValue: null };
  if (type === 'boolean') return { booleanValue: value };
  if (type === 'number') {
    if (Number.isInteger(value)) return { integerValue: value };
    return { doubleValue: value };
  }
  if (type === 'string') {
     // Check for ISO 8601 date string with Z timezone
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
        return { timestampValue: value };
    }
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue),
      },
    };
  }
  if (type === 'object') {
    return {
      mapValue: {
        fields: Object.entries(value).reduce((acc, [k, v]) => {
          acc[k] = toFirestoreValue(v);
          return acc;
        }, {} as { [key: string]: any }),
      },
    };
  }
  return {};
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

    const writes: FirestoreWrite[] = [];
    let ops = 0;

    for (const coll in newEntities) {
      const items = newEntities[coll];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item?.id) {
            ops++;
            writes.push({
              update: {
                name: `projects/${projectId}/databases/(default)/documents/${coll}/${item.id}`,
                fields: Object.entries(item).reduce((acc, [k, v]) => {
                  acc[k] = toFirestoreValue(v);
                  return acc;
                }, {} as {[key: string]: any}),
              },
            });
          }
        }
      }
    }

    if (ops === 0) {
      return NextResponse.json({ ok: true, saved: 0, message: "No documents to save." });
    }
    
    // Call Firestore REST API
    const firestoreApiUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

    const res = await fetch(firestoreApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ writes }),
    });

    if (!res.ok) {
        const errorBody = await res.json();
        console.error('[Firestore REST API Error]', errorBody);
        return NextResponse.json({ ok: false, error: errorBody.error?.message || 'Firestore commit failed.' }, { status: res.status });
    }

    const commitResult = await res.json();
    const writeResultsCount = commitResult.writeResults?.length || 0;

    return NextResponse.json({ ok: true, saved: writeResultsCount });

  } catch (e: any) {
    console.error('[brain-persist] UNHANDLED ERROR:', e?.message);
    return NextResponse.json({ ok: false, error: e.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
