"use client";

import React from 'react';
import { SB_COLORS } from './ui-primitives';

interface ModuleHeaderProps {
    title: string;
    icon: React.ElementType;
    color?: string;
    children?: React.ReactNode;
}

export function ModuleHeader({ title, icon: Icon, color = SB_COLORS.general, children }: ModuleHeaderProps) {
    return (
        <header className="bg-white border-b border-sb-neutral-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-sb-neutral-800 flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20`, color }} aria-hidden="true">
                            <Icon size={24} />
                        </div>
                        {title}
                    </h1>
                    {children && <div className="flex items-center gap-2">{children}</div>}
                </div>
            </div>
        </header>
    );
}
