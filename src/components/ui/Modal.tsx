

"use client";
import React, { PropsWithChildren, useEffect } from "react";

export default function Modal({
  open, onClose, title, children,
}: PropsWithChildren<{ open:boolean; onClose:()=>void; title:string }>) {
  useEffect(()=> {
    const onEsc = (e:KeyboardEvent)=> e.key==="Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return ()=> document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
