
"use client";
import { useData } from "@/lib/dataprovider";
import type { PosTactic, PosTacticItem, PosCostCatalogEntry, PlvMaterial } from "@/domain/ssot";

function nowISO(){ return new Date().toISOString(); }

// ——— Helpers amortización PLV ———
function amortizeForUse(asset?: PlvMaterial): number {
  if (!asset || !asset.purchaseCost) return 0;
  // preferencia: por usos si existe, si no por meses de vida
  if (asset.expectedUses && asset.expectedUses > 0) {
    return asset.purchaseCost / asset.expectedUses;
  }
  const months = asset.expectedLifespanMonths || 12;
  return asset.purchaseCost / Math.max(months, 1);
}

export function usePosTacticsService() {
  const { data, setData, isPersistenceEnabled, saveCollection, currentUser } = useData();

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

  // ——— Catálogo ———
  async function upsertPosCostCatalogEntry(entry: Omit<PosCostCatalogEntry,'createdAt'|'createdById'|'updatedAt'> & { status?: PosCostCatalogEntry['status'] }) {
    const idx = catalog.findIndex(x => x.code === entry.code);
    const stamp = nowISO();
    let next = [...catalog];

    if (idx >= 0) {
      next[idx] = { ...next[idx], ...entry, updatedAt: stamp };
    } else {
      next = [...next, { ...entry, status: entry.status ?? 'ACTIVE', createdAt: stamp, createdById: currentUser?.id || 'system', updatedAt: stamp }];
    }
    await persist({ catalog: next });
    return next.find(x => x.code === entry.code)!;
  }

  // ——— Tácticas ———
  function deriveActualCost(items: PosTacticItem[]): number {
    return items.reduce((s, it) => s + (it.actualCost || 0), 0);
  }

  function materialById(id?: string) { return id ? plv.find(p => p.id === id) : undefined; }

  function normalizeItem(input: Omit<PosTacticItem,'id'|'actualCost'> & { id?: string }): PosTacticItem {
    const id = input.id ?? `item_${Date.now()}_${Math.floor(Math.random()*999)}`;
    let actualCost = input.actualCost ?? 0;

    if (input.assetId) {
      // usar amortización si hay PLV asociado
      const asset = materialById(input.assetId);
      actualCost = amortizeForUse(asset);
    } else if (input.unitCost != null && input.qty != null) {
      actualCost = (input.unitCost || 0) * (input.qty || 0);
    } else if (actualCost == null) {
      actualCost = 0;
    }

    return {
      id,
      catalogCode: input.catalogCode,
      description: input.description,
      qty: input.qty,
      unitCost: input.unitCost,
      actualCost,
      uom: input.uom,
      vendor: input.vendor,
      assetId: input.assetId,
      attachments: input.attachments || []
    };
  }

  async function upsertPosTactic(input: Omit<PosTactic,'id'|'actualCost'|'createdAt'|'createdById'|'updatedAt'> & { id?: string }) {
    if (!input.accountId) throw new Error("accountId es obligatorio");
    if (input.executionScore == null || input.executionScore < 0 || input.executionScore > 100) {
      throw new Error("executionScore 0..100 es obligatorio");
    }
    if (!input.items?.length) throw new Error("Debes añadir al menos una partida (item)");

    const items = input.items.map(i => normalizeItem(i));
    const actualCost = deriveActualCost(items);
    const stamp = nowISO();

    let nextList = [...tactics];
    if (input.id) {
      const idx = nextList.findIndex(t => t.id === input.id);
      const prev = idx >= 0 ? nextList[idx] : undefined;
      const updated: PosTactic = {
        ...(prev || { id: input.id }),
        ...input,
        items,
        actualCost,
        updatedAt: stamp
      } as PosTactic;
      if (idx >= 0) nextList[idx] = updated; else nextList.push(updated);
    } else {
      const doc: PosTactic = {
        id: `tac_${Date.now()}`,
        accountId: input.accountId,
        eventId: input.eventId,
        interactionId: input.interactionId,
        orderId: input.orderId,
        tacticCode: input.tacticCode,
        description: input.description,
        appliesToSkuIds: input.appliesToSkuIds,
        items,
        plannedCost: input.plannedCost,
        actualCost,
        executionScore: input.executionScore,
        status: input.status ?? 'active',
        createdAt: stamp,
        createdById: currentUser?.id || 'system',
        updatedAt: stamp
      };
      nextList.push(doc);
    }
    await persist({ tactics: nextList });
    return nextList[nextList.length-1];
  }

  async function addTacticItem(tacticId: string, item: Omit<PosTacticItem,'id'|'actualCost'> & { id?: string }) {
    const t = tactics.find(x => x.id === tacticId);
    if (!t) throw new Error("Táctica no encontrada");
    const ni = normalizeItem(item);
    const nextItems = [...t.items, ni];
    const next = tactics.map(x => x.id === tacticId ? ({ ...x, items: nextItems, actualCost: deriveActualCost(nextItems), updatedAt: nowISO() }) : x);
    await persist({ tactics: next });
    return next.find(x => x.id === tacticId)!;
  }

  async function closePosTactic(tacticId: string) {
    const t = tactics.find(x => x.id === tacticId);
    if (!t) throw new Error("Táctica no encontrada");
    if (!t.items?.length) throw new Error("No puedes cerrar sin partidas");
    const next = tactics.map(x => x.id === tacticId ? ({ ...x, status: 'closed', updatedAt: nowISO() }) : x);
    await persist({ tactics: next });
    return next.find(x => x.id === tacticId)!;
  }

  // ——— Queries utilitarias ———
  function getPosTacticsByAccount(accountId: string) {
    return tactics.filter(t => t.accountId === accountId);
  }
  function getCatalog() { return catalog.filter(c => c.status !== 'ARCHIVED'); }

  return {
    catalog, tactics, plv,
    upsertPosCostCatalogEntry,
    upsertPosTactic,
    addTacticItem,
    closePosTactic,
    getPosTacticsByAccount,
    getCatalog
  };
}
