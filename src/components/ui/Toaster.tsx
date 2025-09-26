// src/components/ui/Toaster.tsx
"use client";
import React from "react";

type Toast = { id: number; kind: "ok" | "err" | "info"; text: string };
const Ctx = React.createContext<{ push: (t: Omit<Toast,"id">) => void } | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const push = (t: Omit<Toast,"id">) => {
    const id = Date.now() + Math.random();
    setItems(s => [...s, { ...t, id }]);
    setTimeout(() => setItems(s => s.filter(x => x.id !== id)), 3500);
  };
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] space-y-2">
        {items.map(t => (
          <div key={t.id}
               role="status" aria-live="polite"
               className={`px-4 py-2 rounded-xl shadow text-white ${
                 t.kind === "ok" ? "bg-emerald-600" :
                 t.kind === "err" ? "bg-red-600" : "bg-slate-700"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToaster = () => {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToaster dentro de <ToasterProvider>");
  return ctx;
};
