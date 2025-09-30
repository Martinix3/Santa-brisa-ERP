// /features/agenda/components/QuickEditor.tsx
"use client";
import React, { useState } from "react";

export function QuickEditor({ onSave }: { onSave: (text: string) => void }) {
  const [text, setText] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSave(text.trim());
        setText("");
      }
    }
  };

  return (
    <div className="border-b border-[#e5e7eb] pb-2 mb-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe una nota... (ej: 'pedido 10 cajas santa brisa para @bar-sol')"
        className="w-full text-[14px] leading-snug whitespace-pre-wrap text-[#374151] bg-transparent outline-none resize-none"
        rows={2}
      />
    </div>
  );
}
