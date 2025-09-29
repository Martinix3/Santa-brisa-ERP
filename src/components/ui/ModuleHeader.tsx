
"use client";

import React from 'react';
import { SB_COLORS } from '@/domain/ssot';

interface ModuleHeaderProps {
    title: string;
    icon: React.ElementType | (() => React.ReactNode);
    color?: string;
    children?: React.ReactNode;
}

export function ModuleHeader({ title, icon, color, children }: ModuleHeaderProps) {
    const finalColor = color || SB_COLORS.primary.teal;
    const IconComponent = typeof icon === 'function' ? icon : icon;
    
    return (
        <header className="bg-white border-b border-sb-neutral-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-sb-neutral-800 flex items-center gap-3">
                        {typeof IconComponent === 'function' ? <IconComponent /> : (
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${finalColor}20`, color: finalColor }} aria-hidden="true">
                                <IconComponent size={24} />
                            </div>
                        )}
                        {title}
                    </h1>
                    {children && <div className="flex items-center gap-2">{children}</div>}
                </div>
            </div>
        </header>
    );
}
