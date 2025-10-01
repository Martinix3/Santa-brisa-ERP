// src/components/ui/SBPopover.tsx
"use client";
import * as React from "react";
export function SBPopover({anchorId, open, onOpenChange, children}:{anchorId:string; open:boolean; onOpenChange:(v:boolean)=>void; children:React.ReactNode}){
  const anchor = typeof window!=="undefined" ? document.getElementById(anchorId) : null;
  const [pos, setPos] = React.useState<{top:number;left:number}>({top:0,left:0});
  React.useEffect(()=>{
    if(!anchor || !open) return;
    const r = anchor.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 8, left: r.left + window.scrollX });
  },[anchor, open]);
  if(!open) return null;
  return (
    <>
      <div className="sb-popover__overlay" onClick={()=>onOpenChange(false)} />
      <div className="sb-popover" style={{ position:"absolute", top:pos.top, left:pos.left }}>
        {children}
      </div>
    </>
  );
}
