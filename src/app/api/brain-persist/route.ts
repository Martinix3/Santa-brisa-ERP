// src/app/api/brain-persist/route.ts
import { NextResponse } from "next/server";
import { SANTA_DATA_COLLECTIONS } from "@/domain/ssot"; // importa tu lista canónica
import type { SantaData } from "@/domain/ssot";

// ❌ No exportes runtime/dynamic aquí

type NewEntities = Partial<SantaData> | Record<string, any[]>;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const newEntities: NewEntities = (body as any)?.newEntities;
    if (!newEntities || typeof newEntities !== "object") {
      return NextResponse.json({ ok: false, error: "Missing newEntities in request body" }, { status: 400 });
    }

    // This is a mock implementation for a browser-only environment
    console.log("Mock persisting data:", newEntities);
    const writeCount = Object.values(newEntities).reduce((acc, items) => acc + (Array.isArray(items) ? items.length : 0), 0);

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
