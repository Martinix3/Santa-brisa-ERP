
// src/app/(app)/marketing/pos-tactics/page.tsx
import React from 'react';
import { listPosCostCatalog, listPlvInStock, listPosTactics } from '@/server/actions/pos-tactics.service';
import { PosTacticsClientPage } from '@/features/marketing/components/PosTacticsClientPage';
import type { PosTactic as DPosTactic } from '@/domain/ssot';

export const dynamic = 'force-dynamic';

async function getData() {
  const [catalog, plv, tacticsFromSvc] = await Promise.all([
    listPosCostCatalog('ACTIVE'),
    listPlvInStock(),
    listPosTactics(),
  ]);

  const tactics: DPosTactic[] = (tacticsFromSvc as any[]).map((t: any) => ({
    createdAt: t.createdAt ?? new Date().toISOString(),
    createdById: t.createdById ?? 'system',
    updatedAt: t.updatedAt ?? new Date().toISOString(),
    ...t,
  }));

  return { catalog, plv, tactics };
}

export default async function PosTacticsPage() {
  const { catalog, plv, tactics } = await getData();
  
  return <PosTacticsClientPage initialTactics={tactics} catalog={catalog} plv={plv} />;
}
