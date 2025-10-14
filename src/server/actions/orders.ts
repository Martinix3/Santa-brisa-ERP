"use server";

import { adminDb as db } from "@/server/firebase";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { OrderSellOut, OrderLine, Currency, CommercialFlow } from "@/domain/ssot";

const OrderItemInput = z.object({
  sku: z.string().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().optional(),
});

const OrderInput = z.object({
  date: z.string(),
  flow: z.custom<CommercialFlow>(), // 'DIRECT' | 'PLACEMENT'
  currency: z.custom<Currency>(),
  items: z.array(OrderItemInput),
  notes: z.string().optional(),
});

export async function createOrderForAccount(
  accountId: string,
  userId: string,
  input: z.infer<typeof OrderInput>,
) {
  const parsed = OrderInput.parse(input);
  const id = randomUUID();
  const now = new Date().toISOString();

  const lines: OrderLine[] = parsed.items.map((l) => ({
    itemId: l.sku || "",
    sku: l.sku,
    qty: l.qty,
    priceUnit: l.unitPrice ?? 0,
    uom: "unit",
  }));

  const totalAmount = lines.reduce((s, x) => s + x.qty * (x.priceUnit ?? 0), 0);

  const order: Partial<OrderSellOut> & { createdById?: string } = {
    id,
    accountId,
    lines,
    totalAmount,
    currency: parsed.currency,
    notes: parsed.notes,
    flow: parsed.flow,
    status: "open",
    createdAt: now,
    updatedAt: now,
    createdById: userId,
    orderDate: parsed.date,
  };

  await db.collection("ordersSellOut").doc(id).set(order);
  return { id };
}
