// /features/agenda-notes/components/QuickEditor.tsx
import React, { useEffect, useRef, useState } from 'react';

export function QuickEditor({ onSubmit }: { onSubmit: (text:string)=>void }) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement|null>(null);

  useEffect(()=>{ taRef.current?.focus(); }, []);
  useEffect(()=>{ const el=taRef.current; if(!el) return; el.style.height='auto'; el.style.height=Math.min(el.scrollHeight, 320)+'px'; }, [text]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); if(text.trim()) { onSubmit(text); setText(''); } }
  };

  return (
    <div className="relative pt-2 pb-1">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e)=>setText(e.target.value)}
        onKeyDown={handleKey}
        rows={1}
        placeholder="Escribe una nota…"
        className="w-full bg-transparent outline-none border-none resize-none text-[1.05rem] leading-snug caret-black"
      />
      <div className="h-4 text-[11px] text-[hsl(var(--sb-neutral-500))]">{text.length>0?'Enter para guardar · Shift+Enter salto':''}</div>
    </div>
  );
}
