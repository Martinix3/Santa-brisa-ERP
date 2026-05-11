'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from 'react';

export function WidgetFrame({ title, actions, children, className = 'sb-card-glass-light p-4 widget-curved' }:{
  title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string;
}){
  return (
    <section className={className}>
      {(title || actions) && (
        <header className="flex items-center justify-between mb-2">
          {title ? <h3 className="text-sm font-semibold">{title}</h3> : <span />}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
