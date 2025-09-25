
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { SantaData } from '@/domain/ssot';
import { Chat } from '@/features/chat/Chat';
import { SBFlowModal } from './components/SBFlows';

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { data, setData, currentUser, accounts, saveAllCollections } = useData();
  const [isBrainAvailable, setIsBrainAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBrainAvailability = async () => {
      const brainUrl = process.env.NEXT_PUBLIC_SANTA_BRAIN_URL;
      if (!brainUrl) {
        setIsBrainAvailable(false);
        return;
      }
      try {
        const response = await fetch(brainUrl, { method: 'GET', cache: 'no-store' });
        if (response.ok) {
          setIsBrainAvailable(true);
        } else {
          setIsBrainAvailable(false);
        }
      } catch (error) {
        setIsBrainAvailable(false);
      }
    };
    checkBrainAvailability();
  }, []);

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

  const handleQuickSubmit = (payload: any) => {
    // This logic needs to be fully implemented based on the payload structure from SBFlows
    console.log("Quick form submitted:", payload);
    // Example: create interaction
    if (payload.mode === 'interaction') {
        const newInteraction = {
            id: `int_${Date.now()}`,
            userId: currentUser?.id,
            accountId: payload.account,
            kind: payload.kind,
            note: payload.note,
            createdAt: new Date().toISOString(),
            status: 'done',
        };
        saveAllCollections({ interactions: [newInteraction as any] });
    }
    setOpen(false);
  };

  const renderContent = () => {
    if (isBrainAvailable === null) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      );
    }

    if (isBrainAvailable && currentUser) {
      return <Chat userId={currentUser.id} onNewData={handleNewData} />;
    }

    return (
      <div className="flex flex-col h-full">
        <SBFlowModal
          open={true}
          variant="quick"
          onClose={() => setOpen(false)}
          accounts={accounts || []}
          onSearchAccounts={async () => []} // Mock implementation
          onCreateAccount={async () => ({} as any)} // Mock implementation
          onSubmit={handleQuickSubmit}
        />
      </div>
    );
  };
  
  const label = isBrainAvailable ? "Abrir asistente Santa Brain" : "Añadir interacción rápida";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-yellow-400 text-black shadow-2xl flex items-center justify-center hover:bg-yellow-500 transition-transform hover:scale-110"
        aria-label={label}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div 
            className="relative w-[95vw] max-w-2xl h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {isBrainAvailable && (
              <div className="flex-shrink-0 p-4 border-b bg-zinc-50 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-zinc-800">Santa Brain 🧠</h2>
                  <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-zinc-200">
                      <X size={20} />
                  </button>
              </div>
            )}
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
}
