
// src/components/ui/SBSurface.tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Asumiendo que usas una utilidad como esta

export function SBSurface({ children, className }: { children: React.ReactNode; className?: string }) {
    // Reutiliza el componente .sb-card definido globalmente para consistencia.
    return (
        <div className={cn('sb-card', className)}>
             {children}
        </div>
    );
}
