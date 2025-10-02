
"use client";

import React from 'react';
import { cn } from '@/lib/utils'; // Asumiendo el uso de una utilidad para clases

const MODULE_META: Record<string, { accentVar: string; icon?: React.ElementType }> = {
    // A mapping from your module identifiers to CSS variables and icons
    produc: { accentVar: '--sb-accent-produc' },
    calidad: { accentVar: '--sb-accent-calidad' },
    // ... add other modules
};

export function SBPageShell({
  module,
  title,
  subtitle,
  density = 'comfortable',
  children,
}: {
  module: string;
  title: string;
  subtitle?: string;
  density?: 'comfortable' | 'compact';
  children: React.ReactNode;
}) {
  const meta = MODULE_META[module] || { accentVar: '--muted' };
  const accentStyle = { '--tone': `var(${meta.accentVar})` } as React.CSSProperties;

  const densityClasses = {
      comfortable: "px-6 py-8",
      compact: "p-4"
  };

  return (
    <div style={accentStyle}>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={cn('mx-auto max-w-screen-2xl', densityClasses[density])}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {meta.icon && (
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--tone)/0.12)] text-[hsl(var(--tone))]">
                  <meta.icon size={20}/>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold leading-tight text-foreground">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className={cn('mx-auto max-w-screen-2xl', densityClasses[density])}>
        {children}
      </main>
    </div>
  );
}
