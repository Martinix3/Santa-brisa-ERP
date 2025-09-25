// src/features/quicklog/QuickLogOverlay.tsx
"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { SantaData, Account, AccountType, Party, InteractionKind } from '@/domain/ssot';
import { Chat } from '@/features/chat/Chat';
import { SBFlowModal } from './components/SBFlows';

// util de normalización (acentos, casing)
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { data, setData, currentUser, accounts, saveAllCollections } = useData();
  const [isBrainAvailable, setIsBrainAvailable] = useState<boolean | null>(null);

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

  // ✅ AUTOBÚSQUEDA REAL sobre cuentas en memoria
  const onSearchAccounts = useCallback(async (q: string): Promise<Account[]> => {
    const list = accounts || [];
    const nq = norm(q || '');
    if (!nq) return [];
    // busca por nombre y ciudad (si existe en party)
    return list
      .filter(a => {
        const nameHit = norm(a.name).includes(nq);
        const city = (data?.parties?.find(p => p.id === a.partyId)?.billingAddress?.city) || '';
        const cityHit = norm(city).includes(nq);
        return nameHit || cityHit;
      })
      .slice(0, 8);
  }, [accounts, data?.parties]);

  // ✅ Crear cuenta inline mínima (Account + Party) y persistir
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

    // persiste en tu store/Firestore
    await saveAllCollections({ parties: [newParty as any], accounts: [newAccount as any] });

    // devuelve Account completa (por si el caller la necesita)
    return newAccount as Account;
  }, [currentUser?.id, saveAllCollections]);

  // ✅ Guardar interacción resolviendo correctamente el accountId
  const handleQuickSubmit = useCallback((payload: any) => {
    console.log("Quick form submitted:", payload);

    // Resolver accountId:
    // - En tu SBFlows actual, `payload.account` es el NOMBRE si se seleccionó una cuenta existente.
    // - Mejor intenta resolver por id y, si no, por nombre.
    const acc =
      (accounts || []).find(a => a.id === payload.account) ||
      (accounts || []).find(a => a.name === payload.account);

    const accountId = acc?.id;

    if (payload.mode === 'interaction') {
      const newInteraction = {
        id: `int_${Date.now()}`,
        userId: currentUser?.id,
        accountId: accountId || undefined, // si es nueva cuenta, vendrá en payload.newAccount tras guardar el pedido/interacción completa
        kind: (payload.kind as InteractionKind) || 'OTRO',
        note: payload.note,
        createdAt: new Date().toISOString(),
        status: 'done',
      };
      saveAllCollections({ interactions: [newInteraction as any] });
    }

    // TODO: si payload.newAccount/payload.newParty existen (creación inline),
    // primero persístelos y usa sus IDs para la interacción/pedido.

    setOpen(false);
  }, [accounts, currentUser?.id, saveAllCollections]);

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
          onSearchAccounts={onSearchAccounts}     // ← ahora sí busca
          onCreateAccount={onCreateAccount}       // ← crea inline
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
