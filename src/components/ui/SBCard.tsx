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
    <div className={`sb-card ${className || ''}`}>
      {title && (
        <div className="sb-card__header">
          <h3 className="sb-card__title" style={{ borderLeft: accent ? `3px solid ${accent}` : undefined, paddingLeft: accent ? '8px' : '0' }}>
            {title}
          </h3>
        </div>
      )}
      <div className={!noPadding ? "p-4" : ""}>{children}</div>
    </div>
  );
}