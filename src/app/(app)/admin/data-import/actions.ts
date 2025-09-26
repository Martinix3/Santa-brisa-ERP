// ================================================================
// FILE: src/app/(app)/admin/data-import/actions.ts
// PURPOSE: Server actions — CSV templates, preview (FK resolve), commit (upsert)
// NOTES: Implement getServerData/upsertMany en '@/lib/dataprovider/server'
//        Incluye: consigna y muestras, itemId
// ================================================================

'use server';

import { randomUUID } from 'crypto';
import {
  SANTA_DATA_COLLECTIONS,
  type SantaData,
  type Account,
  type OrderSellOut,
  type Interaction,
  type Item,
  type GoodsReceipt,
  type OnHandView,
  type Shipment,
  type User,
  type StockReason,
} from '@/domain/ssot';
import { POLICIES } from '@/lib/codes';
import { getServerData } from '@/lib/dataprovider/server';
import { upsertMany } from '@/lib/dataprovider/actions';

// ---- data adapters (rellena con tu DB) ----
async function getData(): Promise<SantaData> {
  return getServerData();
}
async function persist(coll: keyof SantaData, docs: any[]) {
  return upsertMany(coll, docs);
}

// ---- CSV templates ----
const TEMPLATE_FIELDS: Partial<Record<keyof SantaData, readonly string[]>> = {
  accounts: ['id','code','name','partyId','type','stage','ownerId','createdAt','subType','notes'],
  users: ['id','name','email','role','active','managerId'],
  items: ['id','sku','name','category','uom','bottleMl','caseUnits','casesPerPallet','active','stdCost'],
  ordersSellOut: ['id','docNumber','accountId','accountName','status','createdAt','currency','totalAmount','source','terms','lines','itemId','qty','priceUnit'],
  interactions: ['id','accountId','accountName','userId','userEmail','dept','kind','status','createdAt','note'],
  posTactics: ['id','accountId','tacticCode','actualCost','executionScore','status','createdAt','items'],
  productionOrders: ['id','orderNumber','outputItemId','bomId','targetQuantity','status','createdAt','execution'],
  onHand: ['id','itemId','lotNumber','qty','uom','locationId', 'quality', 'createdAt', 'updatedAt', 'expDate'],
  goodsReceipts: ['id','receiptNumber','supplierPartyId','deliveryNote','receivedAt','lines'],
  shipments: ['id','orderId','accountId','shipmentNumber','createdAt','status','isSample','samplePurpose','lines','customerName','city','postalCode','country'],
  paymentLinks: ['id','financeLinkId','amount','date','method'],
  financeLinks: ['id','docType','status','grossAmount','currency','issueDate','dueDate','partyId'],
  stockMoves: ['id','itemId','lotNumber','uom','qty','fromLocationId','toLocationId','reason','occurredAt','createdAt'],
  materialCosts: ['id','itemId','currency','costPerUom','effectiveFrom'],
};

export async function generateCsvTemplate(coll: keyof SantaData){
  const headers = TEMPLATE_FIELDS[coll] ?? [];
  return headers.join(',') + '\n';
}

// ---- registry & normalizers ----
type FKRegistry = {
  accountsById: Map<string, Account>;
  accountsByName: Map<string, Account>;
  accountsByCode: Map<string, Account>;
  usersById: Map<string, User>;
  usersByEmail: Map<string, User>;
  itemsById: Map<string, Item>;
  onHandById: Map<string, OnHandView>;
  ordersById: Map<string, OrderSellOut>;
};
function buildRegistry(data: SantaData): FKRegistry {
  return {
    accountsById: new Map(data.accounts.map(a=>[a.id,a])),
    accountsByName: new Map(data.accounts.map(a=>[a.name.toLowerCase(),a])),
    accountsByCode: new Map(data.accounts.filter(a=>a.code).map(a=>[String(a.code).toLowerCase(),a])),
    usersById: new Map(data.users.map(u=>[u.id,u])),
    usersByEmail: new Map(data.users.filter(u=>u.email).map(u=>[String(u.email).toLowerCase(),u])),
    itemsById: new Map(data.items.map(m=>[m.id,m])),
    onHandById: new Map(data.onHand.map(l=>[l.id,l])),
    ordersById: new Map(data.ordersSellOut.map(o=>[o.id,o])),
  };
}
const LOT_RE = /^(\d{6})-([A-Z0-9_-]+)-(\d{2,3})$/;
const REASON_ALIASES: Record<string, StockReason> = {
  consign_send: 'consignment_send',
  consign_sell: 'consignment_sell',
  consign_return: 'consignment_return',
  sample_out: 'sample_send',
  sample_use: 'sample_consume',
} as any;
function nBool(x:any){ if (typeof x==='boolean') return x; if (typeof x==='string') return ['true','1','yes','y','si','sí'].includes(x.trim().toLowerCase()); return Boolean(x); }
const nNumComma = (x:any) => { if (typeof x === 'string') x = x.replace(',', '.'); const n = Number(x); return Number.isFinite(n) ? n : 0; };
function j(x:any){ if (x==null||x==='') return undefined; if (typeof x!=='string') return x; try{ return JSON.parse(x);}catch{ return x; } }

function newId(prefix: keyof typeof POLICIES | 'GEN'){ const now=new Date(); const y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0'); const rnd=randomUUID().slice(0,6).toUpperCase(); switch(String(prefix)){ case 'ACCOUNT': return `ACC-${rnd}`; case 'SH': return `SHP-${y}${m}${d}-${rnd.slice(0,3)}`; case 'GR': return `GR-${y}${m}${d}-${rnd.slice(0,3)}`; case 'PO': return `PO-${y}${m}-${rnd.slice(0,4)}`; case 'LOT': return `${String(y).slice(2)}${m}${d}-GEN-${rnd.slice(0,3)}`; default: return `${String(prefix)}-${rnd}`; } }

async function resolveAndNormalize(coll: keyof SantaData, rows: any[], data: SantaData, opts?: { allowCreateAccounts?: boolean }){
  const reg = buildRegistry(data); const info = { createdAccounts: 0, linked: 0, warnings: [] as string[] }; const out:any[]=[];
  for (const r of rows){ const row = { ...r }; for (const k of Object.keys(row)) if (typeof row[k]==='string') row[k] = row[k].trim();

    if (coll==='accounts'){ row.id ||= newId('ACCOUNT'); row.createdAt ||= new Date().toISOString(); out.push(row); continue; }
    if (coll==='items'){ row.active = nBool(row.active ?? true); out.push(row); continue; }

    if (coll==='ordersSellOut'){
      let acc: Account | undefined;
      if (row.accountId) acc = reg.accountsById.get(row.accountId);
      if (!acc && row.accountCode) acc = reg.accountsByCode.get(String(row.accountCode).toLowerCase());
      if (!acc && row.accountName) acc = reg.accountsByName.get(String(row.accountName).toLowerCase());
      if (!acc && (opts?.allowCreateAccounts ?? true) && row.accountName){ const id=newId('ACCOUNT'); acc={ id, partyId:'', name: row.accountName, type:'OTRO', stage:'POTENCIAL', ownerId:'', createdAt: new Date().toISOString() } as Account; info.createdAccounts++; reg.accountsById.set(id,acc); reg.accountsByName.set(acc.name.toLowerCase(),acc); }
      if (!acc) info.warnings.push(`order ${row.id||'(no id)'}: account not found`);
      row.accountId = acc?.id ?? row.accountId; row.currency ||= 'EUR';
      // consigna
      row.terms = (row.terms === 'consignment') ? 'consignment' : 'standard';
      // lines
      let lines = j(row.lines);
      if (!Array.isArray(lines) || lines.length === 0){
        const itemId = row.itemId; const qty = nNumComma(row.qty); const pu = nNumComma(row.priceUnit);
        lines = itemId ? [{ itemId, qty, uom:'unit', priceUnit: pu }] : [];
      }
      row.lines = (lines as any[]).map(l=> ({ itemId: l.itemId, qty: nNumComma(l.qty), uom: l.uom || l.unit || 'unit', priceUnit: nNumComma(l.priceUnit ?? l.unitPrice ?? 0), discount: l.discount? Number(l.discount): undefined }));
      out.push(row); continue;
    }

    if (coll==='interactions'){
      let acc: Account | undefined; if (row.accountId) acc = reg.accountsById.get(row.accountId); if (!acc && row.accountName) acc = reg.accountsByName.get(String(row.accountName).toLowerCase()); if (acc) row.accountId = acc.id; else info.warnings.push(`interaction ${row.id||'(no id)'}: account not found`);
      if (row.userEmail && !row.userId){ const u = reg.usersByEmail.get(String(row.userEmail).toLowerCase()); if (u) row.userId = u.id; else info.warnings.push(`interaction ${row.id||'(no id)'}: user not found`); }
      out.push(row); continue;
    }

    if (coll==='goodsReceipts'){
      const lines = Array.isArray(row.lines) ? row.lines : j(row.lines);
      if (Array.isArray(lines)){
        row.lines = lines.map((ln:any)=> ({ itemId: reg.itemsById.get(ln.itemId)?.id ?? ln.itemId, qty: nNumComma(ln.qty), uom: ln.uom ?? 'unit' }));
      }
      out.push(row); continue;
    }

    if (coll==='onHand'){ out.push(row); continue; }

    if (coll==='shipments'){
      const lines = Array.isArray(row.lines) ? row.lines : j(row.lines);
      if (Array.isArray(lines)) row.lines = lines.map((ln:any)=> ({ itemId: ln.itemId, name: ln.name ?? '', qty: nNumComma(ln.qty), uom: ln.uom ?? 'unit', lotNumber: ln.lotNumber }));
      row.isSample = nBool(row.isSample);
      out.push(row); continue;
    }

    if (coll==='stockMoves'){
      row.qty = nNumComma(row.qty);
      row.reason = REASON_ALIASES[row.reason] ?? row.reason;
      if (row.toLocationId || row.toLocation) {
        const loc = (row.toLocationId ?? row.toLocation) as string;
        if (!reg.accountsById.has(loc)) {
            const acc = reg.accountsByName.get(loc.toLowerCase());
            if (acc) row.toLocationId = acc.id;
        } else {
            row.toLocationId = loc;
        }
        delete row.toLocation;
      }
      if (row.fromLocationId || row.fromLocation) {
        const loc = (row.fromLocationId ?? row.fromLocation) as string;
        if (!reg.accountsById.has(loc)) {
            const acc = reg.accountsByName.get(loc.toLowerCase());
            if (acc) row.fromLocationId = acc.id;
        } else {
            row.fromLocationId = loc;
        }
        delete row.fromLocation;
      }
      out.push(row); continue;
    }

    if (coll==='materialCosts'){
      if (!row.itemId) info.warnings.push(`materialCost: missing itemId`);
      out.push(row); continue;
    }

    // default passthrough
    out.push(row);
  }
  return { rows: out, info };
}

export async function importPreview({ coll, rows }: { coll: keyof SantaData; rows: any[] }){
  const data = await getData();
  const { rows: normalized, info } = await resolveAndNormalize(coll, rows, data, { allowCreateAccounts: true });
  return { coll, count: normalized.length, info, sample: normalized.slice(0,200) };
}
export async function importCommit({ coll, rows }: { coll: keyof SantaData; rows: any[] }){
  const data = await getData();
  const { rows: normalized } = await resolveAndNormalize(coll, rows, data, { allowCreateAccounts: true });
  const res = await persist(coll, normalized);
  return { coll, ...res };
}
