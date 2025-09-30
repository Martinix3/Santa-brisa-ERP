// src/components/ui/SBSurface.tsx
// Placeholder for a potential base surface component. Not used yet.
import React from 'react';

export function SBSurface({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-card text-card-foreground p-4 rounded-lg shadow-sm border ${className}`}>
            {children}
        </div>
    );
}
