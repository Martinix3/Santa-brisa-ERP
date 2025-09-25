
// src/features/marketing/services/posTactics.service.ts

"use client";
import { useData } from "@/lib/dataprovider";
import type { PosTactic, PosTacticItem, PosCostCatalogEntry, PlvMaterial, OrderSellOut } from "@/domain/ssot";
import { usePosTactics } from '@/features/marketing/services/pos.service';

function nowISO(){ return new Date().toISOString(); }

export function usePosTacticsService() {
  const { data, setData, isPersistenceEnabled, saveCollection, currentUser } = useData();
  const { computePosResult } = usePosTactics();

  const catalog: PosCostCatalogEntry[] = (data as any)?.posCostCatalog || [];
  const tactics: PosTactic[] = (data as any)?.posTactics || [];
  const plv: PlvMaterial[] = (data as any)?.plv_material || [];

  async function persist(next: { tactics?: PosTactic[]; catalog?: PosCostCatalogEntry[]; plv?: PlvMaterial[] }) {
    setData(prev => prev ? {
      ...prev,
      posTactics: next.tactics ?? tactics,
      posCostCatalog: next.catalog ?? catalog,
      plv_material: next.plv ?? plv
    } : prev);
    if (isPersistenceEnabled) {
      if (next.tactics) await saveCollection("posTactics", next.tactics);
      if (next.catalog) await saveCollection("posCostCatalog", next.catalog);
      if (next.plv)     await saveCollection("plv_material", next.plv);
    }
  }

  async function upsertPosTactic(input: Omit<PosTactic,'id'|'createdAt'|'createdById'|'updatedAt'> & { id?: string }) {
    if (!input.accountId) throw new Error("accountId es obligatorio");
    if (input.executionScore == null || input.executionScore < 0 || input.executionScore > 100) {
      throw new Error("executionScore 0..100 es obligatorio");
    }
     if (input.actualCost == null) {
      throw new Error("El coste es obligatorio");
    }

    const stamp = nowISO();

    let nextList = [...tactics];
    if (input.id) {
      const idx = nextList.findIndex(t => t.id === input.id);
      const prev = idx >= 0 ? nextList[idx] : {};
      const updated: PosTactic = {
        ...prev,
        ...input,
        updatedAt: stamp
      } as PosTactic;
      if (idx >= 0) nextList[idx] = updated; else nextList.push(updated);
    } else {
      const doc: PosTactic = {
        ...(input as any),
        id: `tac_${Date.now()}`,
        createdAt: stamp,
        createdById: currentUser?.id || 'system',
        updatedAt: stamp
      };
      nextList.push(doc);
    }
    await persist({ tactics: nextList });
    return nextList[nextList.length-1];
  }
  
  async function closePosTactic(tacticId: string) {
    const t = tactics.find(x => x.id === tacticId);
    if (!t) throw new Error("Táctica no encontrada");

    const result = await computePosResult({
      accountId: t.accountId,
      startDate: t.createdAt,
      endDate: t.updatedAt || new Date().toISOString(),
      costTotal: t.actualCost,
      executionScore: t.executionScore,
    });
    
    const next = tactics.map(x => x.id === tacticId ? ({ ...x, status: 'closed' as const, result, updatedAt: nowISO() }) : x);
    
    await persist({ tactics: next });
    return next.find(x => x.id === tacticId)!;
  }
  
  function getPosTacticsByAccount(accountId: string) {
    return tactics.filter(t => t.accountId === accountId);
  }

  return {
    catalog, tactics, plv,
    upsertPosTactic,
    closePosTactic,
    getPosTacticsByAccount,
  };
}
