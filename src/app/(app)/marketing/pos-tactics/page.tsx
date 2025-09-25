// src/app/(app)/marketing/pos-tactics/page.tsx
import React from 'react';
import { listPosCostCatalog, listPlvInStock, listPosTactics } from '@/features/marketing/services/posTactics.service';
import { PosTacticsClientPage } from '@/features/marketing/components/PosTacticsClientPage';

export const dynamic = 'force-dynamic';

async function getData() {
  const [catalog, plv, tactics] = await Promise.all([
    listPosCostCatalog('ACTIVE'),
    listPlvInStock(),
    listPosTactics(),
  ]);

  return { catalog, plv, tactics };
}

export default async function PosTacticsPage() {
  const { catalog, plv, tactics } = await getData();
  
  return <PosTacticsClientPage initialTactics={tactics} catalog={catalog} plv={plv} />;
}
