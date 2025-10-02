// src/features/assistant/components/InlineOrderCard.tsx
"use client";
import React, { useState } from "react";
import { Check, Pencil, X, Factory } from "lucide-react";
import { SBButton } from "@/components/ui/ui-primitives";

export type DraftOrder = {
  accountName: string;
  isNewAccount?: boolean;
  city?: string;
  distributorName?: string;
  lines: Array<{ sku: string; label?: string; qty: number }>;
  notes?: string;
};

export function InlineOrderCard({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: DraftOrder;
  onConfirm: (draft: DraftOrder) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DraftOrder>(initial);
  const [editing, setEditing] = useState(false);

  return (
    <div className="sb-card w-full">
      <div className="sb-card__header">
        <Factory className="sb-icon" />
        <div className="sb-card__title">Nuevo pedido</div>
        <div className="ml-auto flex gap-2">
          {!editing ? (
            <button className="sb-btn-primary px-3 py-1" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Editar
            </button>
          ) : (
            <>
              <button className="sb-btn-primary px-3 py-1" onClick={() => { setEditing(false); onConfirm(draft); }}>
                <Check size={16} /> Guardar
              </button>
              <button className="px-3 py-1 border rounded-lg" onClick={() => setEditing(false)}>
                <X size={16} /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="sb-card__content space-y-3">
        <div className="text-sm">
          <div className="font-medium">
            {draft.accountName} {draft.isNewAccount && <span className="sb-badge sb-badge--info ml-2">Cuenta nueva</span>}
          </div>
          <div className="text-xs text-zinc-600">
            {draft.city ? `Lugar: ${draft.city} · ` : ""}{draft.distributorName ? `Distrib: ${draft.distributorName}` : ""}
          </div>
        </div>

        <div className="space-y-2">
          {draft.lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="min-w-20 text-xs text-zinc-500">{l.sku}</div>
              {editing ? (
                <>
                  <input
                    className="w-12 border rounded-md px-2 py-1"
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={e => {
                      const qty = parseInt(e.target.value || "0", 10);
                      setDraft(d => ({ ...d, lines: d.lines.map((x, idx) => (idx === i ? { ...x, qty } : x)) }));
                    }}
                  />
                  <input
                    className="flex-1 border rounded-md px-2 py-1"
                    placeholder={l.label ?? "Etiqueta"}
                    value={l.label ?? ""}
                    onChange={e => {
                      const label = e.target.value;
                      setDraft(d => ({ ...d, lines: d.lines.map((x, idx) => (idx === i ? { ...x, label } : x)) }));
                    }}
                  />
                </>
              ) : (
                <div className="flex-1">
                  <span className="font-medium">{l.qty} uds</span> {l.label ? `· ${l.label}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          {editing ? (
            <textarea
              className="w-full border rounded-md px-2 py-1"
              placeholder="Notas"
              value={draft.notes ?? ""}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
            />
          ) : (
            draft.notes && <div className="text-sm text-zinc-700">Notas: {draft.notes}</div>
          )}
        </div>
      </div>

      <div className="sb-card__footer flex justify-end gap-2">
        <SBButton onClick={() => onCancel()} variant="ghost">
          Cancelar
        </SBButton>
        <SBButton onClick={() => onConfirm(draft)} data-variant="strong">
          Confirmar pedido
        </SBButton>
      </div>
    </div>
  );
}
