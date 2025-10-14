"use client";
import { useState } from "react";

export function InteractionForm({ accountId }: { accountId: string }) {
  const [kind, setKind] = useState<"VISITA" | "LLAMADA" | "EMAIL" | "WHATSAPP" | "OTRO">("VISITA");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState<string>("");

  // TODO: reemplazar por server action real
  async function createInteraction() {
    // await createInteractionAction({ accountId, kind, note, plannedFor: when })
    console.log("interaction", { accountId, kind, note, when });
  }

  (createInteraction as any).label = "Guardar interacción";

  return (
    <form className="grid gap-3" onSubmit={(e) => e.preventDefault()}>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Tipo</span>
        <select
          className="sb-select"
          value={kind}
          onChange={(e) => setKind(e.target.value as any)}
        >
          <option>VISITA</option>
          <option>LLAMADA</option>
          <option>EMAIL</option>
          <option>WHATSAPP</option>
          <option>OTRO</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Fecha</span>
        <input
          className="sb-input"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Notas</span>
        <textarea
          className="sb-textarea"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </form>
  );
}
