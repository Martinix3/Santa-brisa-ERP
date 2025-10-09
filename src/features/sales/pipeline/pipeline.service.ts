// src/features/sales/pipeline/pipeline.service.ts
import { adminDb as db } from '@/server/firebase';
import type { Account, Interaction, OrderSellOut, User } from '@/domain/ssot';
import { getOne } from '@/lib/dataprovider/server';

export interface PipelineAccount {
    id: string;
    name: string;
    city: string | null;
    zone: string | null;
    distributorId: string | null;
    distributorName: string | null;
    plvInstalled: boolean;
    lostReason: string | null;
    accountStage: "POTENCIAL" | "SEGUIMIENTO" | "ACTIVA" | "FALLIDA" | null;
    stagePreview: "POTENCIAL" | "SEGUIMIENTO" | "ACTIVA" | "FALLIDA";
    desync: boolean;
    lastInteraction: { when: string; kind: string; createdById: string; } | null;
    lastOrderAt: string | null;
    riskDays: number;
    target?: { goal: number; actual: number; period: string };
    isFromOtherDistributor?: boolean;
}

async function fetchCollection<T>(name: string): Promise<T[]> {
    const snap = await db.collection(name).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

function computeStage(account: Account, lastInteraction: Interaction | null, lastOrder: OrderSellOut | null): "POTENCIAL" | "SEGUIMIENTO" | "ACTIVA" | "FALLIDA" {
    if ((account as any).lostReason || lastInteraction?.resultNote?.toLowerCase().includes('respuesta_negativa')) {
        return 'FALLIDA';
    }
    // An account is ACTIVA only if there is at least one order.
    if (lastOrder) {
        return 'ACTIVA';
    }
    // If there's an interaction but no order, it's SEGUIMIENTO.
    if (lastInteraction) {
        return 'SEGUIMIENTO';
    }
    // Otherwise, it's POTENCIAL.
    return 'POTENCIAL';
}

export async function getPipelineData(filters: any): Promise<{ accounts: PipelineAccount[], meta: any }> {
    const [accounts, interactions, orders, parties, users] = await Promise.all([
        fetchCollection<Account>('accounts'),
        fetchCollection<Interaction>('interactions'),
        fetchCollection<OrderSellOut>('ordersSellOut'),
        fetchCollection<Party>('parties'),
        fetchCollection<User>('users'),
    ]);

    const interactionsByAccount = new Map<string, Interaction[]>();
    interactions.forEach(i => {
        if (!i.accountId) return;
        if (!interactionsByAccount.has(i.accountId)) interactionsByAccount.set(i.accountId, []);
        interactionsByAccount.get(i.accountId)!.push(i);
    });

    const ordersByAccount = new Map<string, OrderSellOut[]>();
    orders.forEach(o => {
        if (!o.accountId) return;
        if (!ordersByAccount.has(o.accountId)) ordersByAccount.set(o.accountId, []);
        ordersByAccount.get(o.accountId)!.push(o);
    });
    
    const partiesById = new Map(parties.map(p => [p.id, p]));
    const usersById = new Map(users.map(u => [u.id, u]));

    const resultAccounts: PipelineAccount[] = accounts.map(acc => {
        const accInteractions = (interactionsByAccount.get(acc.id) || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const accOrders = (ordersByAccount.get(acc.id) || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const lastInteraction = accInteractions[0] || null;
        const lastOrder = accOrders[0] || null;

        const stagePreview = computeStage(acc, lastInteraction, lastOrder);
        const accountStage = (acc as any).accountStage || null;

        const party = partiesById.get(acc.partyId);
        const distributor = partiesById.get(acc.distributorId || '');

        const riskDays = lastOrder ? Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 3600 * 24)) : 0;

        return {
            id: acc.id,
            name: acc.name,
            city: party?.billingAddress?.city || null,
            zone: (party?.serviceArea as any)?.zone || null,
            distributorId: acc.distributorId || null,
            distributorName: distributor?.name || null,
            plvInstalled: (acc as any).plvInstalled || false,
            lostReason: (acc as any).lostReason || null,
            accountStage,
            stagePreview,
            desync: accountStage !== null && stagePreview !== accountStage,
            lastInteraction: lastInteraction ? {
                when: lastInteraction.createdAt,
                kind: lastInteraction.kind,
                createdById: usersById.get(lastInteraction.userId)?.name || lastInteraction.userId,
            } : null,
            lastOrderAt: lastOrder?.createdAt || null,
            riskDays,
            isFromOtherDistributor: filters.distributors && acc.distributorId && !filters.distributors.includes(acc.distributorId),
        };
    });
    
    // Apply filters server-side
    let filteredAccounts = resultAccounts;
    if (filters.q) {
        const qLower = filters.q.toLowerCase();
        filteredAccounts = filteredAccounts.filter(a => a.name.toLowerCase().includes(qLower));
    }
    // ... add other filters here ...

    return {
        accounts: filteredAccounts,
        meta: { filtersEcho: filters, generatedAt: new Date().toISOString() },
    };
}
