// src/components/ui/TimePicker.tsx
"use client";
import React, {useEffect, useMemo, useRef, useState} from "react";
import { Clock, X } from "lucide-react";

type DisabledRule =
  | { kind: "exact"; value: string }           // "HH:mm"
  | { kind: "range"; from: string; to: string } // ambos "HH:mm"
  | { kind: "minutes"; every: number };         // p.ej. every: 5 → deshabilita todo salvo múltiplos

export type TimePickerProps = {
  value?: string | null;             // "HH:mm"
  onChange?: (v: string | null) => void;
  step?: number;                     // minutos entre opciones (default 15)
  min?: string;                      // "HH:mm"
  max?: string;                      // "HH:mm"
  placeholder?: string;
  disabled?: boolean;
  disabledRules?: DisabledRule[];
  className?: string;                // para estilos del input
  popoverClassName?: string;         // para el panel
  withSeconds?: boolean;             // (futuro) por defecto false
};

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function inRange(v: number, min?: string, max?: string) {
  const vi = v;
  const minI = min ? toMinutes(min) : 0;
  const maxI = max ? toMinutes(max) : 24*60-1;
  return vi >= minI && vi <= maxI;
}
function isDisabled(mins: number, rules?: DisabledRule[]) {
  if (!rules?.length) return false;
  const hhmm = fromMinutes(mins);
  for (const r of rules) {
    if (r.kind === "exact" && r.value === hhmm) return true;
    if (r.kind === "range") {
      const a = toMinutes(r.from), b = toMinutes(r.to);
      if (mins >= a && mins <= b) return true;
    }
    if (r.kind === "minutes") {
      if (mins % r.every !== 0) return true;
    }
  }
  return false;
}

export function TimePicker({
  value,
  onChange,
  step = 15,
  min,
  max,
  placeholder = "Selecciona hora…",
  disabled,
  disabledRules,
  className = "",
  popoverClassName = "",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ?? "");
  const [active, setActive] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { setText(value ?? ""); }, [value]);

  const options = useMemo(() => {
    const out: { label: string; mins: number; disabled: boolean }[] = [];
    for (let m = 0; m < 24*60; m += step) {
      const okRange = inRange(m, min, max);
      const dis = !okRange || isDisabled(m, disabledRules);
      out.push({ label: fromMinutes(m), mins: m, disabled: dis });
    }
    return out;
  }, [step, min, max, disabledRules]);

  // Seleccionar por texto libre si coincide "HH:mm"
  useEffect(() => {
    if (!open) return;
    const mtch = /^([01]\d|2[0-3]):([0-5]\d)$/.test(text);
    if (mtch) {
      const mins = toMinutes(text);
      const idx = options.findIndex(o => o.mins === mins);
      setActive(idx >= 0 ? idx : null);
      if (idx >= 0 && listRef.current) {
        const el = listRef.current.children[idx] as HTMLElement;
        el?.scrollIntoView({ block: "nearest" });
      }
    } else {
      setActive(null);
    }
  }, [text, open, options]);

  // Cerrar por click fuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function commit(v: string | null) {
    onChange?.(v);
    setText(v ?? "");
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      setTimeout(() => setActive(Math.max(0, options.findIndex(o => !o.disabled))), 0);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => {
        let n = (i ?? -1) + 1;
        while (n < options.length && options[n].disabled) n++;
        return n < options.length ? n : (i ?? null);
      });
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => {
        let n = (i ?? options.length) - 1;
        while (n >= 0 && options[n].disabled) n--;
        return n >= 0 ? n : (i ?? null);
      });
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (active!=null && !options[active].disabled) {
        commit(options[active].label);
      } else {
        // si el texto es válido y no está disabled, confírmalo
        const mtch = /^([01]\d|2[0-3]):([0-5]\d)$/.test(text);
        if (mtch) {
          const mins = toMinutes(text);
          const dis = isDisabled(mins, disabledRules) || !inRange(mins, min, max);
          if (!dis) commit(fromMinutes(mins));
        }
      }
    }
  }

  const nowLabel = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm outline-none focus-within:ring-2 focus-within:ring-[#F7D15F] ${disabled ? "opacity-60 pointer-events-none" : ""} ${className}`}>
        <Clock className="h-4 w-4 text-zinc-500" />
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none"
          inputMode="numeric"
          pattern="[0-2]\d:[0-5]\d"
        />
        {text && (
          <button
            type="button"
            onClick={() => commit(null)}
            className="p-1 rounded hover:bg-zinc-100"
            aria-label="Borrar"
          >
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        )}
      </div>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-[min(20rem,92vw)] rounded-xl border border-zinc-200 bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden ${popoverClassName}`}
        >
          <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500 bg-zinc-50 flex items-center justify-between">
            <span>Selecciona hora</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50"
                onClick={() => commit(nowLabel)}
              >
                Ahora
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50"
                onClick={() => commit(null)}
              >
                Borrar
              </button>
            </div>
          </div>
          <ul ref={listRef} className="max-h-64 overflow-y-auto py-1">
            {options.map((opt, i) => {
              const isActive = i === active;
              return (
                <li key={opt.mins}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onMouseEnter={() => !opt.disabled && setActive(i)}
                    onClick={() => !opt.disabled && commit(opt.label)}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      opt.disabled
                        ? "text-zinc-300 cursor-not-allowed"
                        : isActive
                        ? "bg-yellow-50 text-zinc-900"
                        : "hover:bg-zinc-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
