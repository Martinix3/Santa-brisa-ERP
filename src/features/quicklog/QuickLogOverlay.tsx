

// src/features/quicklog/QuickLogOverlay.tsx
"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { SantaData, Account, AccountType, Party, InteractionKind } from '@/domain/ssot';
import { Chat } from '@/features/chat/Chat';
import { SBFlowModal } from './components/SBFlows';
import { NewCustomerCelebration } from '@/components/ui/NewCustomerCelebration';


// util de normalización (acentos, casing)
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { data, setData, currentUser, saveAllCollections } = useData();
  const [isBrainAvailable, setIsBrainAvailable] = useState<boolean | null>(null);

  const sourceAccounts = (data?.accounts) || [];

  useEffect(() => {
    const checkBrainAvailability = async () => {
      const brainUrl = process.env.NEXT_PUBLIC_SANTA_BRAIN_URL;
      if (!brainUrl) { setIsBrainAvailable(false); return; }
      try {
        const res = await fetch(brainUrl, { method: 'GET', cache: 'no-store' });
        setIsBrainAvailable(res.ok);
      } catch { setIsBrainAvailable(false); }
    };
    checkBrainAvailability();
  }, []);

  const handleNewData = useCallback((newData: Partial<SantaData>) => {
    if (!data) return;
    setData(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      let changed = false;
      for (const key in newData) {
        const col = key as keyof SantaData;
        const newItems = (newData[col] as any[]) || [];
        if (newItems.length) {
          const existing = (updated[col] as any[]) || [];
          const map = new Map(existing.map(it => [it.id, it]));
          newItems.forEach(it => map.set(it.id, it));
          (updated as any)[col] = Array.from(map.values());
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [data, setData]);

  const onSearchAccounts = useCallback(async (q: string): Promise<Account[]> => {
    const list = sourceAccounts;
    const nq = norm(q || '');
    if (!nq) return [];
    
    const res = list
      .filter((a: Account) => {
        const name = (a as any).name || '';
        return norm(name).includes(nq);
      })
      .slice(0, 8);
    
    console.log('[onSearchAccounts]', { q, in: list.length, out: res.length });
    return res as Account[];
  }, [sourceAccounts]);

  const onCreateAccount = useCallback(async (d: { name: string; city?: string; type?: AccountType }) => {
    const partyId = `party_${Date.now()}`;
    const accountId = `acc_${Date.now()}`;

    const newParty: Partial<Party> = {
      id: partyId,
      name: d.name,
      legalName: d.name,
      kind: 'ORG',
      addresses: d.city ? [{ type: 'main', street: '', city: d.city, country: 'España', postalCode: '' }] : [],
      contacts: [],
      createdAt: new Date().toISOString(),
    };

    const newAccount: Partial<Account> = {
      id: accountId,
      partyId,
      name: d.name,
      type: d.type || 'HORECA',
      stage: 'POTENCIAL',
      ownerId: currentUser?.id || 'u_admin',
      createdAt: new Date().toISOString(),
    };

    await saveAllCollections({ parties: [newParty as any], accounts: [newAccount as any] });

    return newAccount as Account;
  }, [currentUser?.id, saveAllCollections]);

  const handleQuickSubmit = useCallback((payload: any) => {
    console.log("Quick form submitted:", payload);

    const acc =
      (sourceAccounts || []).find((a: Account) => a.id === payload.accountId);

    const accountId = acc?.id;

    if (payload.mode === 'interaction') {
      const newInteraction = {
        id: `int_${Date.now()}`,
        userId: currentUser?.id,
        accountId: accountId || undefined,
        kind: (payload.kind as InteractionKind) || 'OTRO',
        note: payload.note,
        createdAt: new Date().toISOString(),
        status: 'done',
      };
      saveAllCollections({ interactions: [newInteraction as any] });
    }

    if(payload.newAccount && payload.newParty && !accountId) {
        const { newAccount, newParty } = payload;
        // In a real app, this logic would be more robust,
        // but for now, we just add them to the state.
        console.log("Creating new account and party from quick log:", newAccount, newParty);
    }
    
    setOpen(false);
  }, [sourceAccounts, currentUser?.id, saveAllCollections]);

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
          accounts={sourceAccounts}
          onSearchAccounts={onSearchAccounts}
          onCreateAccount={onCreateAccount}
          onSubmit={handleQuickSubmit}
          onOrderCreated={(accountName) => {
            // Placeholder for future celebration/notification logic
            console.log(`Order created for ${accountName}`);
          }}
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
