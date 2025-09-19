
// src/app/api/brain-persist/route.ts
"use server";

import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseClient"; // el mismo que usas en db-console
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";


export async function POST(req: Request) {
  try {
    const { newEntities } = await req.json();
    if (!newEntities) {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    const batch = writeBatch(db);
    let ops = 0;

    for (const coll in newEntities) {
      if (!(SANTA_DATA_COLLECTIONS as readonly string[]).includes(coll)) continue;
      
      const items = newEntities[coll];
      if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.id) {
              const ref = doc(db, coll, item.id);
              batch.set(ref, item, { merge: true });
              ops++;
            }
          }
      }
    }

    if (ops > 0) await batch.commit();
    return NextResponse.json({ ok: true, saved: ops });
  } catch (e: any) {
    console.error('[brain-persist] ERROR:', e?.stack || e?.message || e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
