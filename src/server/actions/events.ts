"use server";

import { adminDb as db } from "@/server/firebase";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { MarketingEvent, EventKind } from "@/domain/ssot";

const EventInput = z.object({
  kind: z.custom<EventKind>(),
  title: z.string().min(1),
  startAt: z.string(),
  endAt: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function createEventForAccount(
  accountId: string,
  userId: string,
  input: z.infer<typeof EventInput>,
) {
  const parsed = EventInput.parse(input);
  const id = randomUUID();
  const now = new Date().toISOString();

  const doc: Partial<MarketingEvent> & { ownerUserId?: string } = {
    id,
    accountId,
    title: parsed.title,
    kind: parsed.kind,
    startAt: parsed.startAt,
    endAt: parsed.endAt,
    status: "planned",
    createdAt: now,
    updatedAt: now,
    ownerUserId: userId,
    kpis: { notes: parsed.notes, location: parsed.location },
  };

  await db.collection("marketingEvents").doc(id).set(doc);
  return { id };
}
