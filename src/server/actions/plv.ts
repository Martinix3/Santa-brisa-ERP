"use server";

import { adminDb as db } from "@/server/firebase";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { PlvMaterial } from "@/domain/ssot";

const PlvInput = z.object({
  kind: z.string().min(1),
  title: z.string().optional(),
  quantity: z.number().int().optional(),
  status: z.enum(["SOLICITADO","ENTREGADO","INSTALADO","RETIRADO"]).optional(),
  installedAt: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createPlvForAccount(
  accountId: string,
  userId: string,
  input: z.infer<typeof PlvInput>,
) {
  const parsed = PlvInput.parse(input);
  const id = randomUUID();
  const now = new Date().toISOString();

  const doc: Record<string, any> = {
    id,
    name: parsed.title ?? parsed.kind,
    category: inferCategory(parsed.kind),
    cost: 0,
    accountId,
    qty: parsed.quantity ?? 1,
    status: parsed.status ?? "SOLICITADO",
    installedAt: parsed.installedAt,
    photoUrl: parsed.photoUrl,
    notes: parsed.notes,
    createdAt: now,
    createdById: userId,
    updatedAt: now,
  };

  await db.collection("plv_material").doc(id).set(doc);
  return { id };
}

function inferCategory(kind: string): "DISPLAY" | "SIGNAGE" | "MERCH" {
  const k = kind.toLowerCase();
  if (k.includes("pegatina") || k.includes("vinilo") || k.includes("cartel")) return "SIGNAGE";
  if (k.includes("camiseta") || k.includes("merch") || k.includes("gorra")) return "MERCH";
  return "DISPLAY";
}
