// /features/agenda/components/FooterKPIs.tsx
"use client";
import React from "react";

export function FooterKPIs() {
    return (
         <div className="flex justify-around border-t border-[#e5e7eb] bg-white py-2">
            {['Calendar','Orders','KPIs','Accounts'].map(tab=> (
            <button key={tab} className="flex flex-col items-center text-xs text-[#6b7280] hover:text-[#B25A32]">
                <div className="w-8 h-8 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-1">{tab.charAt(0)}</div>
                {tab}
            </button>
            ))}
        </div>
    );
}
