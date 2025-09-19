
// src/app/api/brain-persist/route.ts
"use server";

import { NextResponse } from "next/server";
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot";

// Helper to convert JS values to Firestore's Value type format
function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: value };
    return { doubleValue: value };
  }
  if (typeof value === 'string') {
    // Basic check for ISO 8601 date string with Z timezone
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
        return { timestampValue: value };
    }
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])
        ),
      },
    };
  }
  return { stringValue: String(value) }; // Fallback
}


export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    const projectId = process.env.FSA_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({ ok: false, error: "Server misconfiguration: FIREBASE_PROJECT_ID is not set." }, { status: 500 });
    }

    const { newEntities } = await req.json();
    if (!newEntities) {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    const writes = [];
    let ops = 0;

    for (const coll in newEntities) {
      if (!(SANTA_DATA_COLLECTIONS as readonly string[]).includes(coll)) continue;
      
      const items = newEntities[coll];
      if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.id) {
              ops++;
              writes.push({
                update: {
                  name: `projects/${projectId}/databases/(default)/documents/${coll}/${item.id}`,
                  fields: Object.fromEntries(
                    Object.entries(item).map(([k, v]) => [k, toFirestoreValue(v)])
                  ),
                },
                updateMask: {
                  fieldPaths: Object.keys(item) // Use updateMask to merge fields
                }
              });
            }
          }
      }
    }

    if (ops > 0) {
       const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
       const response = await fetch(firestoreUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ writes }),
       });

       if (!response.ok) {
          const errorBody = await response.json();
          console.error("Firestore commit error:", errorBody);
          return NextResponse.json({ ok: false, error: `Firestore commit failed: ${errorBody.error?.message || response.statusText}` }, { status: response.status });
       }
    }
    
    return NextResponse.json({ ok: true, saved: ops });

  } catch (e: any) {
    console.error('[brain-persist] ERROR:', e?.stack || e?.message || e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
