// src/components/ui/SBTabs.tsx
"use client";
import React from 'react';

// Tabs simples controlados
export function SBTabs({
  tabs, value, onChange, children,
}: { tabs:{id:string;label:string}[]; value:string; onChange:(id:string)=>void; children?:React.ReactNode }) {
  return (
    <>
      <div role="tablist" className="sb-tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={value===t.id}
                  className="sb-tab" onClick={()=>onChange(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="sb-tabpanel">{children}</div>
    </>
  );
}

// Re-export de Radix para consistencia con ShadCN
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
