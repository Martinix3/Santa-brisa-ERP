// src/server/actions/orders-data.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { Account, Item } from '@/domain/ssot';

export async function searchAccounts(query: string): Promise<Account[]> {
  try {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const accountsRef = db.collection('accounts');

    // Fetch accounts and filter client-side for fuzzy matching
    const snapshot = await accountsRef
      .where('roles', 'array-contains', 'CUSTOMER')
      .limit(100)
      .get();

    const accounts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Account))
      .filter(account => {
        const name = (account.name || '').toLowerCase();
        const vat = (account.vat || '').toLowerCase();

        return name.includes(queryLower) ||
          vat.includes(queryLower);
      })
      .slice(0, 20);

    return accounts;
  } catch (error) {
    console.error('[searchAccounts] Error:', error);
    return [];
  }
}

export async function searchSkus(query: string): Promise<Item[]> {
  try {
    if (!query || query.length < 2) return [];

    const q = query.trim().toLowerCase();

    // Fuente principal: colección 'items' (inventario)
    const itemsRef = db.collection('items');

    // 1) Intento: activos por flag 'active'
    const [activeSnap, isActiveSnap] = await Promise.all([
      itemsRef.where('active', '==', true).limit(200).get(),
      itemsRef.where('isActive', '==', true).limit(200).get(),
    ]);

    const mergeDocs = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
      docs.map(d => ({ id: d.id, ...d.data() } as Item));

    // Unimos y filtramos por nombre o sku (case-insensitive)
    const items = [...mergeDocs(activeSnap.docs), ...mergeDocs(isActiveSnap.docs)]
      .reduce<Item[]>((acc, it) => {
        if (!acc.find(x => x.id === it.id)) acc.push(it); // dedupe
        return acc;
      }, [])
      .filter((it) => {
        const name = (it.name || '').toLowerCase();
        const skuField = (it.sku || it.id || '').toLowerCase();
        return name.includes(q) || skuField.includes(q);
      })
      .slice(0, 20);

    // 2) Fallback: si no hay resultados, probar colección 'skus' (algunas instalaciones antiguas)
    if (items.length === 0) {
      const skusRef = db.collection('skus');
      const skusSnap = await skusRef.limit(200).get();
      const fallback = skusSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .map((raw): Item => ({
          id: raw.id,
          sku: raw.sku || raw.id,
          name: raw.name || raw.title || '',
          category: raw.category || 'fg',
          uom: raw.uom || 'unit',
          active: raw.active ?? (raw.status === 'active' ? true : true),
          priceUnit: raw.priceUnit || raw.priceBase || 0,
        }))
        .filter((it) => {
          const name = (it.name || '').toLowerCase();
          const skuField = (it.sku || it.id || '').toLowerCase();
          return name.includes(q) || skuField.includes(q);
        })
        .slice(0, 20);

      return fallback;
    }

    return items;
  } catch (error) {
    console.error('[searchSkus] Error:', error);
    return [];
  }
}

export async function searchDistributors(query: string): Promise<Account[]> {
  try {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const accountsRef = db.collection('accounts');

    // Fetch distributor accounts
    const snapshot = await accountsRef
      .where('segment', '==', 'DISTRIBUIDOR')
      .limit(100)
      .get();

    const distributors = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Account))
      .filter(account => {
        const name = (account.name || '').toLowerCase();

        return name.includes(queryLower);
      })
      .slice(0, 20);

    return distributors;
  } catch (error) {
    console.error('[searchDistributors] Error:', error);
    return [];
  }
}

// Lista directa de productos activos para selección en pedidos
export async function listOrderItems(): Promise<Item[]> {
  try {
    const itemsRef = db.collection('items');

    const [activeSnap, isActiveSnap] = await Promise.all([
      itemsRef.where('active', '==', true).limit(500).get(),
      itemsRef.where('isActive', '==', true).limit(500).get(),
    ]);

    const byId: Record<string, Item> = {};
    const isFG = (cat: any) => String(cat || '').toLowerCase() === 'fg';
    for (const doc of activeSnap.docs) {
      const data = doc.data() as any;
      if (isFG(data.category)) {
        byId[doc.id] = {
          id: doc.id,
          sku: data.sku || doc.id,
          name: data.name || '',
          category: data.category || 'fg',
          uom: data.uom || 'unit',
          active: data.active ?? true,
          priceUnit: data.priceUnit || data.priceBase || 0,
          priceList: data.priceList || {},
        } as Item;
      }
    }
    for (const doc of isActiveSnap.docs) {
      if (byId[doc.id]) continue;
      const data = doc.data() as any;
      if (isFG(data.category)) {
        byId[doc.id] = {
          id: doc.id,
          sku: data.sku || doc.id,
          name: data.name || '',
          category: data.category || 'fg',
          uom: data.uom || 'unit',
          active: data.isActive ?? true,
          priceUnit: data.priceUnit || data.priceBase || 0,
          priceList: data.priceList || {},
        } as Item;
      }
    }

    let items = Object.values(byId).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));

    if (items.length === 0) {
      // Fallback a colección 'skus'
      const skusSnap = await db.collection('skus').limit(500).get();
      items = skusSnap.docs.map(d => {
        const raw = d.data() as any;
        return {
          id: d.id,
          sku: raw.sku || d.id,
          name: raw.name || raw.title || '',
          category: raw.category || 'fg',
          uom: raw.uom || 'unit',
          active: raw.active ?? (raw.status === 'active' ? true : true),
          priceUnit: raw.priceUnit || raw.priceBase || 0,
          priceList: raw.priceList || {},
        } as Item;
      })
        .filter(it => isFG((it as any).category))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
    }

    return items;
  } catch (error) {
    console.error('[listOrderItems] Error:', error);
    return [];
  }
}
