
"use client";

import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { SantaData, Account, Product } from '@/domain/ssot';
import { Chat } from '@/features/chat/Chat';
import { runSantaBrain } from '@/ai/flows/santa-brain-flow';
import { Message } from 'genkit';
import { saveNewEntities } from '@/services/server/brain-persist';


function FloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-sb-sun shadow-lg flex items-center justify-center text-zinc-900 hover:bg-yellow-500 transition-transform hover:scale-110"
      aria-label="Abrir asistente Santa Brain"
    >
      <Plus size={24} strokeWidth={2.5} />
    </button>
  );
}

function ChatModal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="relative w-[95vw] max-w-2xl h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 p-4 border-b bg-zinc-50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-zinc-800">Santa Brain 🧠</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200">
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

type ChatContext = {
    accounts: Account[];
    products: Product[];
};

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { data, setData, currentUser } = useData();

  const handleNewData = useCallback(async (newData: Partial<SantaData>) => {
    if (!data) return;
    
    // 1. Update local state immediately for snappy UI
    const updatedData = { ...data };
    let hasNewData = false;

    if (newData.interactions && newData.interactions.length > 0) {
        updatedData.interactions = [...updatedData.interactions, ...newData.interactions];
        hasNewData = true;
    }
    if (newData.ordersSellOut && newData.ordersSellOut.length > 0) {
        updatedData.ordersSellOut = [...updatedData.ordersSellOut, ...newData.ordersSellOut];
        hasNewData = true;
    }
    if (newData.mktEvents && newData.mktEvents.length > 0) {
        updatedData.mktEvents = [...(updatedData.mktEvents || []), ...newData.mktEvents];
        hasNewData = true;
    }
     if (newData.accounts && newData.accounts.length > 0) {
        const accountMap = new Map(updatedData.accounts.map(a => [a.id, a]));
        newData.accounts.forEach(acc => accountMap.set(acc.id, acc));
        updatedData.accounts = Array.from(accountMap.values());
        hasNewData = true;
    }

    if (hasNewData) {
        setData(updatedData);
        // 2. Persist changes to the backend
        try {
            await saveNewEntities(newData);
            console.log("Entities successfully saved to Firestore.");
        } catch (error) {
            console.error("Failed to save entities to Firestore:", error);
            // Optionally, show an error to the user
        }
    }
  }, [data, setData]);

  if (!data || !currentUser) return null;

  const chatRunner = (history: Message[], input: string, context: ChatContext) => {
      return runSantaBrain(history, input, context);
  }

  return (
    <>
      <FloatingButton onClick={() => setOpen(true)} />
      <ChatModal open={open} onClose={() => setOpen(false)}>
        <Chat
          userId={currentUser.id}
          context={{
              accounts: data.accounts,
              products: data.products,
          }}
          onNewData={handleNewData}
          runner={chatRunner}
        />
      </ChatModal>
    </>
  );
}
