
"use client";

import React from 'react';
import { SB_COLORS } from '@/domain/ssot';

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
  const meta = MODULE_META[module] || { accentVar: '--sb-neutral-500' };
  const accentStyle = { '--tone': `var(${meta.accentVar})` } as React.CSSProperties;

  const densityClasses = {
      comfortable: "px-6 py-8",
      compact: "p-4"
  };

  return (
    <div style={accentStyle}>
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className={`mx-auto max-w-screen-2xl ${densityClasses[density]}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {meta.icon && (
                <div className="h-10 w-10 rounded-xl grid place-items-center bg-[hsl(var(--tone)/0.12)] text-[hsl(var(--tone))]">
                  <meta.icon size={20}/>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-zinc-900 leading-tight">{title}</h1>
                {subtitle && <p className="text-xs text-zinc-600">{subtitle}</p>}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className={`mx-auto max-w-screen-2xl ${densityClasses[density]}`}>
        {children}
      </main>
    </div>
  );
}
