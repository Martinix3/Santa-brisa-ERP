
"use client";

import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { SantaData, SB_THEME } from '@/domain/ssot';
import { Chat } from '@/features/chat/Chat';

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { data, setData, currentUser } = useData();

  const handleNewData = useCallback((newData: Partial<SantaData>) => {
    if (!data) return;
    
    setData(prevData => {
        if (!prevData) return null;

        const updatedData = { ...prevData };
        let hasChanges = false;

        for (const key in newData) {
            const collectionName = key as keyof SantaData;
            const newItems = (newData[collectionName] as any[]) || [];
            
            if (newItems.length > 0) {
                const existingItems = (updatedData[collectionName] as any[]) || [];
                const itemMap = new Map(existingItems.map(item => [item.id, item]));

                newItems.forEach(newItem => {
                    itemMap.set(newItem.id, newItem); // Add or update
                });

                updatedData[collectionName] = Array.from(itemMap.values()) as any;
                hasChanges = true;
            }
        }
        
        return hasChanges ? updatedData : prevData;
    });

  }, [data, setData]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="sb-btn-primary fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-110"
        aria-label="Abrir asistente Santa Brain"
      >
        <Plus size={24} strokeWidth={2.5} className="sb-icon" />
      </button>

      {open && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <div 
                className="relative w-[95vw] max-w-2xl h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 p-4 border-b bg-zinc-50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-zinc-800">Santa Brain 🧠</h2>
                    <button onClick={() => setOpen(false)} className="sb-btn-primary p-2 rounded-full hover:bg-zinc-200">
                        <X size={20} />
                    </button>
                </div>
                {currentUser ? (
                     <Chat
                        userId={currentUser.id}
                        onNewData={handleNewData}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-zinc-500 p-4">
                        <p>Por favor, inicia sesión para usar Santa Brain.</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </>
  );
}
