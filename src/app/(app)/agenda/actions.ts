// src/app/(app)/agenda/actions.ts
"use server";
import { adminDb as db } from "@/server/firebase";
import type { Department } from '@/domain/ssot';

export async function createInteraction(input: {
  accountId: string;
  dept: Department;
  kind: string;          // "VISITA" | "LLAMADA" | ...
  note?: string;
  plannedFor?: string;   // ISO
  createdById: string;
  linkedEntity?: { type:"ORDER"; id:string };
}) {
  if (!input.accountId) throw new Error("Cuenta requerida");
  const now = new Date().toISOString();
  const ref = db.collection("interactions").doc();
  await ref.set({
    id: ref.id,
    status: "open",
    ...input,
    userId: input.createdById, // Ensure compatibility with existing fields
    createdAt: now,
    updatedAt: now,
  });
  return { id: ref.id };
}