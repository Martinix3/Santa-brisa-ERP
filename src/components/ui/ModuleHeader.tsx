/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


"use client";

import React from 'react';

interface ModuleHeaderProps {
    title: string;
    icon: React.ElementType;
    children?: React.ReactNode;
}

export function ModuleHeader({ title, icon: Icon, children }: ModuleHeaderProps) {
    return (
        <header className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary text-muted-foreground" aria-hidden="true">
                            <Icon size={20} />
                        </div>
                        {title}
                    </h1>
                    {children && <div className="flex items-center gap-2">{children}</div>}
                </div>
            </div>
        </header>
    );
}
