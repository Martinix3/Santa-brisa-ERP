// src/components/ui/SBCard.tsx
"use client";
import React from 'react';

interface SBCardProps {
  title?: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SBCard({ title, accent, children, className, noPadding }: SBCardProps) {
  return (
    <div className={`bg-card text-card-foreground border border-zinc-200 rounded-xl shadow-sm overflow-hidden ${className || ''}`}>
      {title && (
        <div className="p-4 border-b border-zinc-200">
          <h3 className="font-semibold text-zinc-800" style={{ borderLeft: accent ? `3px solid ${accent}` : undefined, paddingLeft: accent ? '8px' : '0' }}>
            {title}
          </h3>
        </div>
      )}
      <div className={!noPadding ? "p-4" : ""}>{children}</div>
    </div>
  );
}
