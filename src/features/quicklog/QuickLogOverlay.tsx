// src/features/quicklog/QuickLogOverlay.tsx
"use client";
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { QuickLogContainer } from './QuickLogContainer';

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { currentUser } = useData();

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

      {/* Drawer/Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              <QuickLogContainer
                userId={currentUser.id}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
