
"use client";

import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { SantaData, Account, Product, OrderSellOut, Interaction, InventoryItem, EventMarketing, User } from '@/domain/ssot';
import { Chat } from '@/features/chat/Chat';

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { data, setData, currentUser } = useData();

  const handleNewData = useCallback((newData: Partial<SantaData>) => {
    if (!data) return;
    
    // Create a new object for the updated data to ensure reactivity
    const updatedData = { ...data };
    let hasChanges = false;
    
    // Merge new data into the existing state
    for (const key in newData) {
        const collectionName = key as keyof SantaData;
        if (newData[collectionName] && Array.isArray(newData[collectionName])) {
            const newItems = newData[collectionName] as any[];
            if (newItems.length > 0) {
                 const existingItems = (updatedData[collectionName] as any[]) || [];
                 // Filter out items that already exist to prevent duplicates
                 const uniqueNewItems = newItems.filter(newItem => !existingItems.some(existingItem => existingItem.id === newItem.id));
                 updatedData[collectionName] = [ ...existingItems, ...uniqueNewItems] as any;
                 
                 // Also handle updates
                 newItems.forEach(newItem => {
                    const index = (updatedData[collectionName] as any[]).findIndex(i => i.id === newItem.id);
                    if (index !== -1) {
                        (updatedData[collectionName] as any[])[index] = newItem;
                    }
                 });

                 hasChanges = true;
            }
        }
    }
    
    if (hasChanges) {
        setData(updatedData);
    }
  }, [data, setData]);

  if (!data || !currentUser) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-sb-sun shadow-lg flex items-center justify-center text-zinc-900 hover:bg-yellow-500 transition-transform hover:scale-110"
        aria-label="Abrir asistente Santa Brain"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {open && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <div 
                className="relative w-[95vw] max-w-2xl h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 p-4 border-b bg-zinc-50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-zinc-800">Santa Brain 🧠</h2>
                    <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-zinc-200">
                        <X size={20} />
                    </button>
                </div>
                <Chat
                    userId={currentUser.id}
                    onNewData={handleNewData}
                />
            </div>
        </div>
      )}
    </>
  );
}
