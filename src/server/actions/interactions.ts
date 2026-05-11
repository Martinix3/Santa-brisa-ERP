"use server";

import { adminDb as db } from "@/server/firebase";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { Interaction, InteractionKind, InteractionStatus } from "@/domain/ssot";

const InteractionInput = z.object({
  kind: z.custom<InteractionKind>(),
  when: z.string().optional(),
  status: z.custom<InteractionStatus>(),
  resultNote: z.string().optional(),
  summary: z.string().optional(),
  nextAt: z.string().optional(),
});

export async function createInteractionForAccount(
  accountId: string,
  userId: string,
  input: z.infer<typeof InteractionInput>,
) {
  const parsed = InteractionInput.parse(input);
  const id = randomUUID();
  const now = new Date().toISOString();

  const doc: Partial<Interaction> & { createdById?: string } = {
    id,
    accountId,
    kind: parsed.kind,
    plannedFor: parsed.when || now,
    status: parsed.status,
    resultNote: parsed.resultNote,
    note: parsed.summary,
    createdAt: now,
    updatedAt: now,
    createdById: userId,
  };

  await db.collection("interactions").doc(id).set(doc);
  return { id };
}
