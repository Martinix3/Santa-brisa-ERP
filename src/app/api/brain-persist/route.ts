// src/app/api/brain-persist/route.ts
import { NextResponse } from "next/server";
import { upsertMany } from '@/lib/dataprovider/server';
import type { SantaData } from "@/domain/ssot";

type NewEntities = Partial<SantaData>;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const newEntities: NewEntities = (body as any)?.newEntities;
    if (!newEntities || typeof newEntities !== "object") {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    let writeCount = 0;
    const promises = [];
    for (const coll in newEntities) {
      const collectionName = coll as keyof SantaData;
      const items = newEntities[collectionName];
      if (Array.isArray(items) && items.length > 0) {
        promises.push(upsertMany(collectionName, items));
        writeCount += items.length;
      }
    }
    
    await Promise.all(promises);

    if (writeCount === 0) {
      return NextResponse.json({ ok: true, saved: 0, message: "No valid documents to save." });
    }
    
    return NextResponse.json({ ok: true, saved: writeCount, message: "Data persisted in mock environment." });
    
  } catch (e: any) {
    console.error("[brain-persist] Server error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e.message || "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
