// src/features/quicklog/QuickLogOverlay.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { SantaData, Account, AccountType, Party, InteractionKind } from '@/domain/ssot';
import { SBFlowModal } from './components/SBFlows';
import { NewCustomerCelebration } from '@/components/ui/NewCustomerCelebration';

// util de normalización (acentos, casing)
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { data, currentUser, saveAllCollections } = useData();

  const onSearchAccounts = useCallback(async (q: string): Promise<Account[]> => {
    const list = data?.accounts || [];
    const nq = norm(q || '');
    if (!nq) return [];
    return list.filter((a: Account) => norm(a.name).includes(nq)).slice(0, 8);
  }, [data?.accounts]);

  const onCreateAccount = useCallback(async (d: { name: string; city?: string; type?: AccountType, distributorPartyId?: string }) => {
    const partyId = `party_${Date.now()}`;
    const accountId = `acc_${Date.now()}`;

    const newParty: Partial<Party> = {
      id: partyId,
      name: d.name,
      legalName: d.name,
      kind: 'ORG',
      billingAddress: d.city ? { address: '', city: d.city, country: 'España', zip: '' } : undefined,
      emails: [],
      phones: [],
      createdAt: new Date().toISOString(),
    };

    const newAccount: Partial<Account> = {
      id: accountId,
      partyId,
      name: d.name,
      segment: d.type || 'HORECA',
      stage: 'POTENCIAL',
      ownerId: currentUser?.id || 'u_admin',
      createdAt: new Date().toISOString(),
      flow: 'PLACEMENT', // Forzado a colocación
      distributorPartyId: d.distributorPartyId,
    };

    await saveAllCollections({ parties: [newParty as any], accounts: [newAccount as any] });

    return newAccount as Account;
  }, [currentUser?.id, saveAllCollections]);

  const handleQuickSubmit = useCallback((payload: any) => {
    console.log("Quick form submitted (Placement):", payload);

    if (payload.mode === 'interaction') {
      const newInteraction = {
        id: `int_${Date.now()}`,
        userId: currentUser?.id,
        accountId: payload.accountId || undefined,
        kind: 'OTRO' as InteractionKind,
        note: payload.note,
        createdAt: new Date().toISOString(),
        status: 'done',
      };
      saveAllCollections({ interactions: [newInteraction as any] });
    }
    
    setOpen(false);
  }, [currentUser?.id, saveAllCollections]);

  const renderContent = () => {
    if (!currentUser) return null;

    return (
        <SBFlowModal
          open={true}
          variant="quick"
          onClose={() => setOpen(false)}
          accounts={data?.accounts || []}
          onSearchAccounts={onSearchAccounts}
          onCreateAccount={onCreateAccount}
          onSubmit={handleQuickSubmit}
          context='PLACEMENT' // Forzar contexto a Colocación
        />
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-yellow-400 text-black shadow-2xl flex items-center justify-center hover:bg-yellow-500 transition-transform hover:scale-110"
        aria-label={"Añadir interacción rápida de colocación"}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="relative w-[95vw] max-w-2xl h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
}
