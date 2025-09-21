// ================================================================
// FILE: src/app/(app)/admin/data-import/actions.ts
// PURPOSE: Server actions — CSV templates, preview (FK resolve), commit (upsert)
// NOTES: Implement getServerData/upsertMany en '@/lib/dataprovider/server'
//        Incluye: consigna y muestras, materialSku → materialId
// ================================================================

'use server';

import { randomUUID } from 'crypto';
import {
  SANTA_DATA_COLLECTIONS,
  CODE_POLICIES,
  type SantaData,
  type Account,
  type OrderSellOut,
  type Interaction,
  type Product,
  type GoodsReceipt,
  type Lot,
  type Material,
  type Shipment,
  type User,
  type StockReason,
} from '@/domain/ssot';

// ---- data adapters (rellena con tu DB) ----
async function getData(): Promise<SantaData> {
  const { getServerData } = await import('@/lib/dataprovider/server');
  return getServerData();
}
async function persist(coll: keyof SantaData, docs: any[]) {
  const { upsertMany } = await import('@/lib/dataprovider/server');
  return upsertMany(coll, docs);
}

// ---- CSV templates ----
const TEMPLATE_FIELDS: Partial<Record<keyof SantaData, readonly string[]>> = {
  accounts: ['id','code','name','partyId','type','stage','ownerId','createdAt','subType','notes'],
  users: ['id','name','email','role','active','managerId'],
  products: ['id','sku','name','category','bottleMl','caseUnits','casesPerPallet','active','materialId'],
  materials: ['id','sku','name','category','uom','standardCost'],
  ordersSellOut: ['id','docNumber','accountId','accountName','status','createdAt','currency','totalAmount','source','terms','lines'],
  interactions: ['id','accountId','accountName','userId','userEmail','dept','kind','status','createdAt','note'],
  plv_material: ['id','sku','kind','status','accountId','installedAt','photoUrl'],
  promotions: ['id','code','name','type','value','validFrom','validTo'],
  marketingEvents: ['id','title','kind','status','startAt','endAt','accountId','kpis','links'],
  influencerCollabs: ['id','creatorId','creatorName','platform','tier','status','ownerUserId','couponCode','utmCampaign','tracking'],
  posTactics: ['id','accountId','tacticCode','actualCost','executionScore','status','createdAt','items'],
  productionOrders: ['id','orderNumber','sku','bomId','targetQuantity','status','createdAt','execution'],
  lots: ['id','lotCode','sku','quantity','createdAt','orderId','supplierId','quality'],
  goodsReceipts: ['id','receiptNumber','supplierPartyId','deliveryNote','receivedAt','lines'],
  shipments: ['id','orderId','accountId','shipmentNumber','createdAt','status','isSample','samplePurpose','lines','customerName','city','postalCode','country'],
  paymentLinks: ['id','financeLinkId','amount','date','method'],
  financeLinks: ['id','docType','status','grossAmount','currency','issueDate','dueDate','partyId'],
  stockMoves: ['id','sku','lotId','uom','qty','fromLocation','toLocation','reason','occurredAt','createdAt'],
  materialCosts: ['id','materialId','materialSku','currency','costPerUom','effectiveFrom'],
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
  productsBySku: Map<string, Product>;
  lotsById: Map<string, Lot>;
  materialsById: Map<string, Material>;
  materialsBySku: Map<string, Material>;
  ordersById: Map<string, OrderSellOut>;
};
function buildRegistry(data: SantaData): FKRegistry {
  return {
    accountsById: new Map(data.accounts.map(a=>[a.id,a])),
    accountsByName: new Map(data.accounts.map(a=>[a.name.toLowerCase(),a])),
    accountsByCode: new Map(data.accounts.filter(a=>a.code).map(a=>[String(a.code).toLowerCase(),a])),
    usersById: new Map(data.users.map(u=>[u.id,u])),
    usersByEmail: new Map(data.users.filter(u=>u.email).map(u=>[String(u.email).toLowerCase(),u])),
    productsBySku: new Map(data.products.map(p=>[p.sku,p])),
    lotsById: new Map(data.lots.map(l=>[l.id,l])),
    materialsById: new Map(data.materials.map(m=>[m.id,m])),
    materialsBySku: new Map(data.materials.filter(m=>m.sku).map(m=>[String(m.sku),m])),
    ordersById: new Map(data.ordersSellOut.map(o=>[o.id,o])),
  };
}
const LOT_RE = /^\d{6}-[A-Z0-9_-]+-\d{3}$/;
const REASON_ALIASES: Record<string, StockReason> = {
  consign_send: 'consignment_send',
  consign_sell: 'consignment_sell',
  consign_return: 'consignment_return',
  sample_out: 'sample_send',
  sample_use: 'sample_consume',
} as any;
function nBool(x:any){ if (typeof x==='boolean') return x; if (typeof x==='string') return ['true','1','yes','y','si','sí'].includes(x.trim().toLowerCase()); return Boolean(x); }
function nNum(x:any){ const n=Number(x); return Number.isFinite(n)? n: 0; }
function j(x:any){ if (x==null||x==='') return undefined; if (typeof x!=='string') return x; try{ return JSON.parse(x);}catch{ return x; } }
function newId(prefix: keyof typeof CODE_POLICIES | 'GEN'){ const now=new Date(); const y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0'); const rnd=randomUUID().slice(0,6).toUpperCase(); switch(prefix){ case 'ACCOUNT': return `ACC-${rnd}`; case 'SHIPMENT': return `SHP-${y}${m}${d}-${rnd.slice(0,3)}`; case 'GOODS_RECEIPT': return `GR-${y}${m}${d}-${rnd.slice(0,3)}`; case 'PROD_ORDER': return `PO-${y}${m}-${rnd.slice(0,4)}`; case 'LOT': return `${String(y).slice(2)}${m}${d}-GEN-${rnd.slice(0,3)}`; default: return `${prefix}-${rnd}`; } }

async function resolveAndNormalize(coll: keyof SantaData, rows: any[], data: SantaData, opts?: { allowCreateAccounts?: boolean }){
  const reg = buildRegistry(data); const info = { createdAccounts: 0, linked: 0, warnings: [] as string[] }; const out:any[]=[];
  for (const r of rows){ const row = { ...r }; for (const k of Object.keys(row)) if (typeof row[k]==='string') row[k] = row[k].trim();

    if (coll==='accounts'){ row.id ||= newId('ACCOUNT'); row.createdAt ||= new Date().toISOString(); out.push(row); continue; }
    if (coll==='products'){ row.active = nBool(row.active ?? true); out.push(row); continue; }

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
      if (!Array.isArray(lines)){
        const sku = row.sku ?? row.productSku; const qty = nNum(row.qty);
        lines = sku ? [{ sku, qty, uom:'uds', priceUnit: nNum(row.priceUnit) }] : [];
      }
      row.lines = (lines as any[]).map(l=> ({ sku: l.sku, qty: nNum(l.qty), uom: l.uom ?? 'uds', priceUnit: nNum(l.priceUnit ?? 0), discount: l.discount? Number(l.discount): undefined }));
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
        row.lines = lines.map((ln:any)=> ({ materialId: reg.materialsById.get(ln.materialId)?.id ?? reg.materialsBySku.get(ln.materialSku)?.id ?? ln.materialId, sku: ln.sku, lotId: ln.lotId, qty: nNum(ln.qty), uom: ln.uom ?? 'uds' }));
      }
      out.push(row); continue;
    }

    if (coll==='lots'){ const code = String(row.lotCode ?? row.id ?? '').trim(); if (code && !LOT_RE.test(code)) row.lotCode = code; out.push(row); continue; }

    if (coll==='shipments'){
      const lines = Array.isArray(row.lines) ? row.lines : j(row.lines);
      if (Array.isArray(lines)) row.lines = lines.map((ln:any)=> ({ sku: ln.sku, name: ln.name ?? '', qty: nNum(ln.qty), uom: ln.uom ?? 'uds', lotNumber: ln.lotNumber }));
      row.isSample = nBool(row.isSample);
      out.push(row); continue;
    }

    if (coll==='stockMoves'){
      row.qty = nNum(row.qty);
      row.reason = REASON_ALIASES[row.reason] ?? row.reason;
      out.push(row); continue;
    }

    if (coll==='materialCosts'){
      if (row.materialSku && !row.materialId) row.materialId = reg.materialsBySku.get(row.materialSku)?.id ?? row.materialId;
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
