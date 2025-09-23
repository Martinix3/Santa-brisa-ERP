
"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Briefcase, ChevronLeft } from 'lucide-react';
import type { Account, AccountType, OrderSellOut, Party, Product, SantaData } from '@/domain/ssot';
import { CreateOrderForm } from '@/features/quicklog/components/SBFlows';
import { upsertMany } from '@/lib/dataprovider/actions';
import { generateNextOrder } from '@/lib/codes';

function CreateOrderPageContent() {
    const router = useRouter();
    const { data, setData, currentUser } = useData();

    const handleSubmit = async (payload: {
        account: string;
        newAccount?: Partial<Account>;
        newParty?: Partial<Party>;
        requestedDate?: string;
        deliveryDate?: string;
        channel: AccountType;
        paymentTerms?: string;
        shipTo?: string;
        note?: string;
        items: { sku: string; qty: number; unit: "uds"; priceUnit: number, lotNumber?: string }[];
    }) => {
        if (!data || !currentUser) return;

        let accountId = data.accounts.find(a => a.name === payload.account)?.id;
        let partyId = data.accounts.find(a => a.id === accountId)?.partyId;
        
        const collectionsToSave: Partial<SantaData> = {};

        if (payload.newAccount && payload.newParty) {
            accountId = payload.newAccount.id!;
            partyId = payload.newParty.id!;
            collectionsToSave.parties = [...(data.parties || []), payload.newParty as Party];
            collectionsToSave.accounts = [...(data.accounts || []), payload.newAccount as Account];
        }

        if (!accountId || !partyId) {
            alert('Error: No se pudo determinar la cuenta o el contacto.');
            return;
        }

        const newOrder: OrderSellOut = {
            id: `ord_${Date.now()}`,
            docNumber: generateNextOrder((data.ordersSellOut || []).map(o => o.docNumber || ''), payload.channel, new Date()),
            accountId: accountId,
            partyId: partyId,
            source: 'MANUAL',
            status: 'open',
            billingStatus: 'PENDING',
            currency: 'EUR',
            createdAt: payload.requestedDate || new Date().toISOString(),
            lines: payload.items.map(item => ({ ...item, name: data.products.find(p => p.sku === item.sku)?.name || item.sku })),
            notes: payload.note,
        };

        const finalCollectionsToSave: Partial<SantaData> = {
            ...collectionsToSave,
            ordersSellOut: [...(data.ordersSellOut || []), newOrder],
        };

        // Optimistic update
        setData(prev => prev ? { ...prev, ...finalCollectionsToSave } : prev);

        // Server action
        const entries = Object.entries(finalCollectionsToSave) as [keyof SantaData, any][];
        for (const [col, docs] of entries) {
          await upsertMany(String(col), docs);
        }
        
        router.push('/orders');
    };

    const handleSearchAccounts = async (query: string): Promise<Account[]> => {
        if (!data) return [];
        const lowerQuery = query.toLowerCase();
        return data.accounts.filter(a => a.name.toLowerCase().includes(lowerQuery));
    };

    const handleCreateAccount = async (accountData: { name: string; city?: string; type?: AccountType }): Promise<Account> => {
        // This is a simplified version for the form component, the actual creation happens in handleSubmit
        const tempId = `new_acc_${Date.now()}`;
        return {
            id: tempId,
            partyId: `new_party_${Date.now()}`,
            name: accountData.name,
            type: accountData.type || 'HORECA',
            stage: 'POTENCIAL',
            ownerId: currentUser?.id || 'system',
            createdAt: new Date().toISOString(),
        };
    };

    if (!data) {
        return <div className="p-6">Cargando datos...</div>;
    }
    
    return (
        <div className="max-w-4xl mx-auto py-6 px-4">
            <CreateOrderForm 
                accounts={data.accounts}
                onSearchAccounts={handleSearchAccounts}
                onCreateAccount={handleCreateAccount}
                onSubmit={handleSubmit}
                onCancel={() => router.push('/orders')}
            />
        </div>
    );
}

export default function NewOrderPage() {
    return (
        <>
            <ModuleHeader title="Nuevo Pedido" icon={Briefcase}>
                <a href="/orders" className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
                    <ChevronLeft size={16} /> Volver a Pedidos
                </a>
            </ModuleHeader>
            <CreateOrderPageContent />
        </>
    );
}
