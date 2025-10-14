"use client";
import { useState } from "react";

export function EventForm({ accountId }: { accountId: string }) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // TODO: reemplazar por server action real
  async function createEvent() {
    // await createCalendarEventAction({ accountId, title, startAt: start, endAt: end })
    console.log("event", { accountId, title, start, end });
  }

  (createEvent as any).label = "Crear evento";

  return (
    <form className="grid gap-3" onSubmit={(e) => e.preventDefault()}>
      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Título</span>
        <input
          className="sb-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Inicio</span>
          <input
            className="sb-input"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Fin</span>
          <input
            className="sb-input"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>
    </form>
  );
}
