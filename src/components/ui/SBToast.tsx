// src/components/ui/SBToast.tsx
"use client";
import * as React from "react";
export function useSBToast() {
  const [items, setItems] = React.useState<{ id:number; msg:string; kind?: "success"|"error" }[]>([]);
  const push = (msg: string, kind?: "success"|"error") => {
    const id = Date.now();
    setItems((s) => [...s, { id, msg, kind }]);
    setTimeout(() => setItems((s) => s.filter(i => i.id !== id)), 3000);
  };
  const ui = (
    <div className="sb-toastctr">
      {items.map(t => (
        <div key={t.id} className={`sb-toast ${t.kind==='success'?'sb-toast--success':''} ${t.kind==='error'?'sb-toast--error':''}`}>{t.msg}</div>
      ))}
    </div>
  );
  return { push, ui };
}