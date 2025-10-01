// src/components/ui/SBTooltip.tsx
"use client";
import * as React from "react";

export function SBTooltip({ content, children }:{content:React.ReactNode; children:React.ReactNode}) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="sb-tooltip" data-open={open}
          onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)}>
      {children}
      <span role="tooltip" className="sb-tooltip__pop">
        {content}
        <i className="sb-tooltip__arrow" />
      </span>
    </span>
  );
}
