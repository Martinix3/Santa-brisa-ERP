"use client";
import { useState } from "react";

export function PosForm({ accountId }: { accountId: string }) {
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [cost, setCost] = useState<number>(0);

  // TODO: reemplazar por server action real
  async function createPos() {
    // await createPosTacticAction({ accountId, description: desc, qtyPlanned: qty, estCost: cost })
    console.log("pos", { accountId, desc, qty, cost });
  }

  (createPos as any).label = "Guardar acción PLV";

  return (
    <form className="grid gap-3" onSubmit={(e) => e.preventDefault()}>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Descripción</span>
        <input
          className="sb-input"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Cantidad</span>
          <input
            className="sb-input"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Coste estimado (€)</span>
          <input
            className="sb-input"
            type="number"
            min={0}
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
          />
        </label>
      </div>
    </form>
  );
}
