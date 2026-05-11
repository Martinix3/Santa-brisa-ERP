/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/quicklog/QuickLogOverlay.tsx
"use client";
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { QuickLogNotebook } from './QuickLogNotebook';

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<'MANUAL' | 'AI'>('MANUAL');
  const { currentUser } = useData();

  // Permitir abrir desde otras vistas
  React.useEffect(() => {
    const handleOpenManual = () => {
      setInitialMode('MANUAL');
      setOpen(true);
    };
    const handleOpenAI = () => {
      setInitialMode('AI');
      setOpen(true);
    };
    window.addEventListener('quicklog:open', handleOpenManual as any);
    window.addEventListener('quicklog:open:ai', handleOpenAI as any);
    return () => {
      window.removeEventListener('quicklog:open', handleOpenManual as any);
      window.removeEventListener('quicklog:open:ai', handleOpenAI as any);
    };
  }, []);

  if (!currentUser?.id) {
    return null;
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-yellow-400 text-black shadow-2xl flex items-center justify-center hover:bg-yellow-500 transition-transform hover:scale-110"
        aria-label="QuickLog - Registrar acción rápida"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Drawer/Overlay - Nuevo diseño */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          
          <div 
            className="relative w-full max-w-2xl h-full bg-background shadow-2xl animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <QuickLogNotebook onClose={() => setOpen(false)} initialMode={initialMode} />
          </div>
        </div>
      )}
    </>
  );
}
