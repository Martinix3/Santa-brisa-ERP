"use client";
import { useState } from "react";

export function OrderForm({ accountId }: { accountId: string }) {
  const [flow, setFlow] = useState<"DIRECT" | "PLACEMENT">("DIRECT");
  const [lines, setLines] = useState<{ sku: string; qty: number; uom: "unit" | "case" }[]>([
    { sku: "", qty: 1, uom: "unit" },
  ]);

  function setLine(i: number, patch: Partial<(typeof lines)[number]>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  // TODO: reemplazar por server action real
  async function createOrder() {
    // await createOrderAction({ accountId, flow, lines })
    console.log("order", { accountId, flow, lines });
  }

  (createOrder as any).label = "Crear pedido";

  return (
    <form className="grid gap-3" onSubmit={(e) => e.preventDefault()}>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Flujo</span>
        <select
          className="sb-select"
          value={flow}
          onChange={(e) => setFlow(e.target.value as any)}
        >
          <option value="DIRECT">Directa</option>
          <option value="PLACEMENT">Colocación</option>
        </select>
      </label>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Líneas</div>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_100px_28px] gap-2">
            <input
              className="sb-input"
              placeholder="SKU"
              value={l.sku}
              onChange={(e) => setLine(i, { sku: e.target.value })}
            />
            <input
              className="sb-input"
              type="number"
              min={1}
              value={l.qty}
              onChange={(e) => setLine(i, { qty: Number(e.target.value) })}
            />
            <select
              className="sb-select"
              value={l.uom}
              onChange={(e) => setLine(i, { uom: e.target.value as any })}
            >
              <option>unit</option>
              <option>case</option>
            </select>
            <button
              type="button"
              className="sb-btn sb-btn--icon sb-btn--ghost"
              onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="sb-btn sb-btn--secondary"
          onClick={() => setLines([...lines, { sku: "", qty: 1, uom: "unit" }])}
        >
          + Añadir línea
        </button>
      </div>
    </form>
  );
}
