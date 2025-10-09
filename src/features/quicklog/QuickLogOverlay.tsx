// src/features/quicklog/QuickLogOverlay.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { SantaData, Account, AccountType, InteractionKind, PosTactic, PosTacticItem, PartyRole, CustomerData, CommercialFlow, Segment } from '@/domain/ssot';
import { QuickLogDialog } from './QuickLogDialog';
import { NewCustomerCelebration } from '@/components/ui/NewCustomerCelebration';
import { toast } from 'sonner';

// util de normalización (acentos, casing)
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

export default function QuickLogOverlay() {
  const [open, setOpen] = useState(false);
  const { data, currentUser, saveAllCollections } = useData();

  const onSearchAccounts = useCallback(async (q: string): Promise<Account[]> => {
    const list = (data?.accounts || []).filter(a => a.flow === 'COLOCACION');
    const nq = norm(q || '');
    if (!nq) return [];
    return list.filter((a: Account) => norm(a.name).includes(nq)).slice(0, 8);
  }, [data?.accounts]);

  const onCreateAccount = useCallback(async (d: { name: string; city?: string; type?: Segment, distributorPartyId?: string }) => {
    const partyId = `party_${Date.now()}`;
    const accountId = `acc_${Date.now()}`;

    const newParty: Partial<Party> = {
      id: partyId,
      name: d.name,
      legalName: d.name,
      kind: 'ORG',
      billingAddress: d.city ? { street: '', city: d.city, country: 'España', zip: '' } : undefined,
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
      flow: 'COLOCACION', // Forzado a colocación
      distributorPartyId: d.distributorId,
    };

    await saveAllCollections({ parties: [newParty as any], accounts: [newAccount as any] });

    return newAccount as Account;
  }, [currentUser?.id, saveAllCollections]);

  const handleQuickSubmit = useCallback(async (payload: any, openTask?: boolean) => {
    try {
      let finalAccountId = payload.accountId;
      const now = new Date().toISOString();
      const collections: any = {};

      // 1. Crear cuenta si es necesario
      if (payload.newAccount && payload.newAccount.name.trim()) {
        const partyId = `party_${Date.now()}`;
        const accountId = `acc_${Date.now()}`;

        const newParty: Partial<Party> = {
          id: partyId,
          name: payload.newAccount.name.trim(),
          legalName: payload.newAccount.name.trim(),
          kind: 'ORG',
          billingAddress: {
            street: payload.newAccount.address || '',
            city: payload.newAccount.city || '',
            province: payload.newAccount.province || '',
            country: 'España',
            zip: ''
          },
          emails: payload.newAccount.email ? [{ value: payload.newAccount.email, isPrimary: true }] : [],
          phones: payload.newAccount.phone ? [{ value: payload.newAccount.phone, isPrimary: true }] : [],
          roles: ['CUSTOMER' as any],
          createdAt: now,
          updatedAt: now,
        };

        const newAccount: Partial<Account> = {
          id: accountId,
          partyId,
          name: payload.newAccount.name.trim(),
          segment: payload.newAccount.accountType || 'HORECA',
          stage: 'POTENCIAL',
          ownerId: currentUser?.id || 'u_admin',
          flow: 'DIRECTA',
          createdAt: now,
          updatedAt: now,
        };

        collections.parties = [newParty as any];
        collections.accounts = [newAccount as any];
        finalAccountId = accountId;
      }

      // 2. Crear según tipo
      if (payload.type === 'interaction') {
        const newInteraction = {
          id: `int_${Date.now()}`,
          userId: currentUser?.id,
          accountId: finalAccountId,
          kind: payload.kind || 'OTRO',
          dept: payload.dept || 'VENTAS',
          note: payload.note || '',
          createdAt: now,
          updatedAt: now,
          status: 'done' as any,
          plannedFor: payload.date ? `${payload.date}T12:00:00.000Z` : undefined,
        };
        collections.interactions = [newInteraction as any];

        // Si hay follow-up programado
        if (payload.scheduleFollowUp && payload.followUpDate) {
          const followUpInteraction = {
            id: `int_${Date.now() + 1}`,
            userId: currentUser?.id,
            accountId: finalAccountId,
            kind: 'OTRO' as any,
            dept: payload.dept || 'VENTAS',
            note: `Seguimiento de: ${payload.note || ''}`,
            createdAt: now,
            updatedAt: now,
            status: 'open' as any,
            plannedFor: `${payload.followUpDate}T12:00:00.000Z`,
          };
          collections.interactions.push(followUpInteraction);
        }
      }

      if (payload.type === 'order') {
        const validLines = payload.lines.filter((l: any) => l.sku && l.qty > 0);
        if (validLines.length > 0) {
          const newOrder = {
            id: `order_${Date.now()}`,
            accountId: finalAccountId,
            distributorId: payload.distributorId,
            status: 'open' as any,
            billingStatus: 'DRAFT' as any,
            lines: validLines.map((l: any) => {
              const item = data?.items?.find(i => i.sku === l.sku);
              return {
                sku: item?.id || l.sku,
                name: item?.name || l.sku,
                qty: l.qty,
                uom: 'UNIT' as any,
                priceUnit: 0,
              };
            }),
            totalAmount: 0,
            currency: 'EUR' as any,
            notes: payload.note || '',
            createdAt: now,
            updatedAt: now,
            orderDate: payload.date || now.split('T')[0],
            createdById: currentUser?.id,
          };
          collections.ordersSellOut = [newOrder as any];
        }
      }

      if (payload.type === 'event') {
        const newEvent = {
          id: `evt_${Date.now()}`,
          title: `${payload.eventType} - ${data?.accounts?.find(a => a.id === finalAccountId)?.name || 'Sin cuenta'}`,
          kind: 'OTRO' as any,
          startAt: payload.date ? `${payload.date}T12:00:00.000Z` : now,
          status: 'planned' as any,
          accountId: payload.isAccountAssociated ? finalAccountId : undefined,
          ownerUserId: currentUser?.id,
          createdAt: now,
          updatedAt: now,
        };
        collections.marketingEvents = [newEvent as any];
      }

      if (payload.type === 'pos') {
        if (payload.items && payload.items.length > 0) {
          const newPosTactic = {
            id: `pos_${Date.now()}`,
            accountId: finalAccountId,
            description: 'Entrega de materiales POS',
            items: payload.items.map((item: any) => ({
              catalogId: item.catalogId,
              customName: item.customName,
              qty: item.qty,
              unitCost: item.cost || 0,
            })),
            actualCost: payload.items.reduce((sum: number, i: any) => sum + ((i.cost || 0) * i.qty), 0),
            executionScore: 100,
            status: 'DELIVERED' as any,
            createdAt: now,
            updatedAt: now,
            createdById: currentUser?.id,
          };
          collections.posTactics = [newPosTactic as any];
        }
      }

      // Guardar todo
      if (Object.keys(collections).length > 0) {
        await saveAllCollections(collections);
        console.info('[QuickLog] Saved:', collections);
        
        // Mostrar confirmación
        if (payload.newAccount) {
          toast.success(`✅ Cuenta "${payload.newAccount.name}" creada correctamente`);
        } else {
          toast.success('✅ Guardado correctamente');
        }
        
        // Forzar refresco de la página para ver los cambios
        setTimeout(() => window.location.reload(), 500);
      }

      setOpen(false);
    } catch (error) {
      console.error('[QuickLog] Error saving:', error);
      toast.error('Error al guardar. Por favor intenta de nuevo.');
    }
  }, [currentUser?.id, saveAllCollections, data?.items, data?.accounts]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-yellow-400 text-black shadow-2xl flex items-center justify-center hover:bg-yellow-500 transition-transform hover:scale-110"
        aria-label={"Añadir interacción rápida de colocación"}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {open && (
        <QuickLogDialog
            open={open}
            onOpenChange={setOpen}
            onSaved={handleQuickSubmit}
        />
      )}
    </>
  );
}
