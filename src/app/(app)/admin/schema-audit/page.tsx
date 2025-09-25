
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { BadgeCheck, FileJson, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import type { SantaData, SB_THEME } from '@/domain/ssot';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';
import { CODE_POLICIES } from "@/domain/ssot"; // para validar patrones de códigos

// =====================================================
// DEFINICIONES DEL ESQUEMA ESPERADO (SSOT)
// =====================================================

const ALLOWED_KEYS: Partial<Record<keyof SantaData, string[]>> = {
    accounts: ['id', 'partyId', 'name', 'type', 'stage', 'ownerId', 'createdAt', 'subType', 'notes'],
    ordersSellOut: ['id', 'accountId', 'lines', 'status', 'createdAt', 'currency', 'totalAmount', 'source', 'notes'],
    interactions: ['id', 'userId', 'accountId', 'kind', 'note', 'createdAt', 'status', 'plannedFor', 'resultNote', 'dept', 'involvedUserIds', 'linkedEntity'],
    shipments: ['id', 'orderId', 'accountId', 'status', 'createdAt', 'lines', 'customerName', 'city', 'carrier', 'tracking', 'labelUrl', 'holdedDeliveryId'],
    productionOrders: ['id', 'sku', 'bomId', 'targetQuantity', 'status', 'createdAt', 'lotId', 'execution', 'costing', 'shortages', 'reservations', 'actuals', 'checks', 'incidents'],
    lots: ['id', 'sku', 'quantity', 'createdAt', 'quality', 'expDate', 'orderId', 'supplierId', 'lotCode'],
    users: ['id', 'name', 'email', 'role', 'active', 'kpiBaseline'],
    parties: ['id', 'name', 'kind', 'createdAt', 'taxId', 'contacts', 'addresses', 'handles', 'tags'],
    products: ['id', 'sku', 'name', 'category', 'active', 'bottleMl', 'caseUnits', 'casesPerPallet', 'materialId'],
    materials: ['id', 'sku', 'name', 'category', 'uom', 'standardCost'],
};

const ENUMS: Record<string, Set<any>> = {
    accountStage: new Set(['POTENCIAL', 'ACTIVA', 'SEGUIMIENTO', 'FALLIDA', 'CERRADA', 'BAJA']),
    orderStatus: new Set(['open', 'confirmed', 'shipped', 'invoiced', 'paid', 'cancelled', 'lost']),
    shipmentStatus: new Set(['pending', 'picking', 'ready_to_ship', 'shipped', 'delivered', 'cancelled']),
    prodStatus: new Set(['planned', 'released', 'wip', 'done', 'cancelled']),
    lotQuality: new Set(['hold', 'release', 'reject']),
    userRole: new Set(['comercial', 'admin', 'ops', 'owner']),
};

const ENUM_CHECKS: Partial<Record<keyof SantaData, { path: string, enum: keyof typeof ENUMS }[]>> = {
    accounts: [{ path: 'stage', enum: 'accountStage' }],
    ordersSellOut: [{ path: 'status', enum: 'orderStatus' }],
    shipments: [{ path: 'status', enum: 'shipmentStatus' }],
    productionOrders: [{ path: 'status', enum: 'prodStatus' }],
    lots: [{ path: 'quality.qcStatus', enum: 'lotQuality' }],
    users: [{ path: 'role', enum: 'userRole' }],
};

// === KPI TRACE — ampliar cobertura a Ventas/Marketing/Producción/Logística/Finanzas ===
const KPI_TRACE: Record<string, { label: string; needs: Array<{ coll: keyof SantaData; fields: string[] }> }> = {
  // --- VENTAS ---
  sales_open_orders: { label: 'Pedidos abiertos', needs: [ { coll: 'ordersSellOut', fields: ['status','createdAt','accountId'] } ] },
  sales_confirmed_to_shipped_leadtime: { label: 'Lead time (confirm → ship)', needs: [ { coll: 'ordersSellOut', fields: ['status','createdAt'] }, { coll: 'shipments', fields: ['orderId','createdAt'] } ] },
  sales_month_amount: { label: 'Importe mensual', needs: [ { coll: 'ordersSellOut', fields: ['totalAmount','createdAt','status','accountId'] } ] },
  sales_avg_ticket: { label: 'Ticket medio', needs: [ { coll: 'ordersSellOut', fields: ['totalAmount','createdAt'] } ] },
  sales_repeat_rate: { label: '% Recompra', needs: [ { coll: 'ordersSellOut', fields: ['accountId','createdAt'] } ] },
  sales_sku_mix: { label: 'Mix por SKU', needs: [ { coll: 'ordersSellOut', fields: ['lines','createdAt'] }, { coll: 'products', fields: ['sku','name'] } ] },
  sales_conversion_rate: { label: 'Conversión visita→pedido', needs: [ { coll: 'interactions', fields: ['kind','status','createdAt','accountId'] }, { coll: 'ordersSellOut', fields: ['accountId','createdAt'] } ] },

  // --- MARKETING ---
  mkt_plv_penetration: { label: 'Penetración PLV (%)', needs: [ { coll: 'plv_material', fields: ['status','accountId','installedAt'] }, { coll: 'accounts', fields: ['id','stage'] } ] },
  mkt_promo_adoption: { label: 'Adopción Promos (%)', needs: [ { coll: 'ordersSellOut', fields: ['lines','createdAt'] }, { coll: 'promotions', fields: ['id','validFrom','validTo'] } ] },
  mkt_event_roi: { label: 'ROI Eventos', needs: [ { coll: 'marketingEvents', fields: ['spend','kpis','links'] }, { coll: 'ordersSellOut', fields: ['totalAmount','createdAt','accountId'] } ] },
  mkt_influencers_roi: { label: 'ROI Influencers', needs: [ { coll: 'influencerCollabs', fields: ['tracking','costs','couponCode','utmCampaign'] }, { coll: 'ordersSellOut', fields: ['createdAt','accountId','totalAmount'] } ] },
  mkt_pos_cost_per_account: { label: 'Coste POS por cuenta', needs: [ { coll: 'posTactics', fields: ['accountId','actualCost','createdAt'] } ] },

  // --- PRODUCCIÓN ---
  prod_yield: { label: 'Rendimiento de producción (%)', needs: [ { coll: 'productionOrders', fields: ['targetQuantity','execution.goodBottles'] } ] },
  prod_variance_cost: { label: 'Varianza de coste', needs: [ { coll: 'productionOrders', fields: ['costing.actual.total','costing.stdCostPerUom','execution.goodBottles'] } ] },
  prod_oee_simplified: { label: 'OEE (simple)', needs: [ { coll: 'productionOrders', fields: ['execution.durationHours','execution.goodBottles','targetQuantity'] } ] },
  prod_bom_compliance: { label: 'Cumplimiento BOM', needs: [ { coll: 'billOfMaterials', fields: ['items','batchSize'] }, { coll: 'productionOrders', fields: ['actuals','sku','bomId'] } ] },

  // --- CALIDAD / TRAZABILIDAD ---
  qa_hold_ratio: { label: '% Lotes en HOLD', needs: [ { coll: 'lots', fields: ['quality.qcStatus','createdAt'] } ] },
  qa_incidents_rate: { label: 'Incidencias / mes', needs: [ { coll: 'incidents', fields: ['kind','openedAt','status'] } ] },
  trace_lot_genealogy: { label: 'Genealogía de lotes (cobertura)', needs: [ { coll: 'traceEvents', fields: ['subject','links','phase','kind','occurredAt'] }, { coll: 'lots', fields: ['id','sku'] } ] },

  // --- LOGÍSTICA / ALMACÉN ---
  wh_stock_turnover: { label: 'Stock Turnover', needs: [ { coll: 'stockMoves', fields: ['sku','qty','reason','occurredAt'] }, { coll: 'inventory', fields: ['sku','qty','updatedAt'] } ] },
  wh_lot_allocation_rate: { label: 'Pedidos con lote asignado (%)', needs: [ { coll: 'ordersSellOut', fields: ['lines'] } ] },
  wh_otif: { label: 'OTIF (On Time In Full)', needs: [ { coll: 'shipments', fields: ['createdAt','status','orderId'] }, { coll: 'ordersSellOut', fields: ['createdAt','id'] } ] },

  // --- FINANZAS ---
  fin_cash_collected: { label: 'Cobros del mes', needs: [ { coll: 'paymentLinks', fields: ['amount','date'] } ] },
  fin_dso: { label: 'DSO (Days Sales Outstanding)', needs: [ { coll: 'financeLinks', fields: ['docType','issueDate','dueDate','status','grossAmount','currency','partyId'] } ] },
  fin_cogs_per_sku: { label: 'COGS por SKU', needs: [ { coll: 'materialCosts', fields: ['materialId','costPerUom','effectiveFrom'] }, { coll: 'products', fields: ['materialId','sku'] } ] },
};


// === 1) Claves REQUERIDAS (subset crítico que NO debe faltar) ===
const REQUIRED_KEYS: Partial<Record<keyof SantaData, readonly string[]>> = {
  parties: ['id','kind','name','createdAt'],
  users: ['id','name','role','active'],
  accounts: ['id','partyId','name','type','stage','ownerId','createdAt'],
  ordersSellOut: ['id','accountId','status','createdAt','currency'],
  interactions: ['id','userId','kind','status','createdAt'],
  products: ['id','sku','name','active'],
  materials: ['id','sku','name','category'],
  billOfMaterials: ['id','sku','items','batchSize'],
  productionOrders: ['id','sku','bomId','targetQuantity','status','createdAt'],
  lots: ['id','sku','quantity','quality.qcStatus','createdAt'],
  inventory: ['id','sku','qty','uom','locationId','updatedAt'],
  stockMoves: ['id','sku','qty','uom','reason','occurredAt','createdAt'],
  shipments: ['id','orderId','accountId','status','createdAt','lines'],
  goodsReceipts: ['id','supplierPartyId','receivedAt','lines','status'],
  financeLinks: ['id','docType','status','grossAmount','currency','issueDate'],
  paymentLinks: ['id','financeLinkId','amount','date'],
  traceEvents: ['id','subject','phase','kind','occurredAt'],
  incidents: ['id','kind','status','openedAt'],
};

// === 2) Validadores de formato / rango ===
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T?\d{0,2}:?\d{0,2}:?\d{0,2}(?:\.\d+)?Z?$/i;
const isISODate = (v:any)=> typeof v==='string' && (/\d{4}-\d{2}-\d{2}/.test(v) || ISO_DATE.test(v));
const nonNeg = (n:any)=> typeof n==='number' && n>=0;
const isPct = (n:any)=> typeof n==='number' && n>=0 && n<=100;
const isEUR = (c:any)=> c==='EUR';

type Sev = 'UNKNOWN_KEY'|'MISSING_KEY'|'ENUM'|'REF'|'FORMAT'|'RANGE';

type Violation = {
  collection: keyof SantaData;
  id: string;
  kind: string;
  key?: string;
  at?: string;
  expected?: string;
  value?: any;
};
type ViolationX = Violation & { sev?: Sev };

// === 3) Índices rápidos para FKs ===
function buildIndexes(data: SantaData | null){
  const idx = {
    account: new Set<string>(),
    lot: new Set<string>(),
    productSku: new Set<string>(),
    materialId: new Set<string>(),
    bomId: new Set<string>(),
    orderId: new Set<string>(),
  };
  if (!data) return idx;
  for (const a of data.accounts ?? []) idx.account.add(a.id);
  for (const l of data.lots ?? []) idx.lot.add(l.id);
  for (const p of data.products ?? []) idx.productSku.add(p.sku);
  for (const m of data.materials ?? []) idx.materialId.add(m.id);
  for (const b of data.billOfMaterials ?? []) idx.bomId.add(b.id);
  for (const o of data.ordersSellOut ?? []) idx.orderId.add(o.id);
  return idx;
}

// === 4) Chequeos por colección (referencias, formatos, rangos, códigos) ===
function auditDocument(coll: keyof SantaData, doc: any, idx: ReturnType<typeof buildIndexes>): ViolationX[] {
  const v: ViolationX[] = [];
  const id = doc?.id || doc?.code;

  // Required keys
  for (const k of (REQUIRED_KEYS[coll] ?? [])){
    // soportar nested "a.b.c"
    const val = k.split('.').reduce((a,kk)=> (a? a[kk] : undefined), doc);
    if (val === undefined) v.push({ collection: coll, id, kind:'MISSING_KEY', key:k, sev:'MISSING_KEY' });
  }

  // Formats / ranges (mínimo útil por colección)
  if (coll==='ordersSellOut'){
    if (!isEUR(doc?.currency)) v.push({ collection: coll, id, kind:'FORMAT', at:'currency', value:doc?.currency, expected:'EUR', sev:'FORMAT' });
    if (doc?.totalAmount!=null && !nonNeg(doc.totalAmount)) v.push({ collection: coll, id, kind:'RANGE', at:'totalAmount', value:doc.totalAmount, sev:'RANGE' });
    if (doc?.createdAt && !isISODate(doc.createdAt)) v.push({ collection: coll, id, kind:'FORMAT', at:'createdAt', value:doc.createdAt, sev:'FORMAT' });
  }

  if (coll==='shipments'){
    // códigos: SHIPMENT_NUMBER si usas CODE_POLICIES.SHIPMENT
    if (doc?.shipmentNumber && !new RegExp(CODE_POLICIES.SHIPMENT.regex).test(doc.shipmentNumber)){
      v.push({ collection: coll, id, kind:'FORMAT', at:'shipmentNumber', value:doc.shipmentNumber, expected:CODE_POLICIES.SHIPMENT.regex, sev:'FORMAT' });
    }
  }

  if (coll==='lots'){
    if (doc?.lotCode && !new RegExp(CODE_POLICIES.LOT.regex).test(doc.lotCode)){
      v.push({ collection: coll, id, kind:'FORMAT', at:'lotCode', value:doc.lotCode, expected:CODE_POLICIES.LOT.regex, sev:'FORMAT' });
    }
  }

  if (coll==='productionOrders'){
    if (typeof doc?.targetQuantity==='number' && doc.targetQuantity<=0){
      v.push({ collection: coll, id, kind:'RANGE', at:'targetQuantity', value:doc.targetQuantity, sev:'RANGE' });
    }
  }

  // Referential integrity
  if (coll==='ordersSellOut'){
    if (doc?.accountId && !idx.account.has(doc.accountId)){
      v.push({ collection: coll, id, kind:'REF', at:'accountId', value:doc.accountId, sev:'REF' });
    }
    for (const ln of (doc?.lines ?? [])){
      if (ln?.sku && !idx.productSku.has(ln.sku)) v.push({ collection: coll, id, kind:'REF', at:'lines[].sku', value:ln.sku, sev:'REF' });
      for (const lid of (ln?.lotIds ?? [])){
        if (!idx.lot.has(lid)) v.push({ collection: coll, id, kind:'REF', at:'lines[].lotIds[]', value:lid, sev:'REF' });
      }
    }
  }

  if (coll==='shipments'){
    if (doc?.orderId && !idx.orderId.has(doc.orderId)) v.push({ collection: coll, id, kind:'REF', at:'orderId', value:doc.orderId, sev:'REF' });
    if (doc?.accountId && !idx.account.has(doc.accountId)) v.push({ collection: coll, id, kind:'REF', at:'accountId', value:doc.accountId, sev:'REF' });
    for (const ln of (doc?.lines ?? [])){
      if (ln?.lotNumber && !idx.lot.has(ln.lotNumber)){
        v.push({ collection: coll, id, kind:'REF', at:'lines[].lotNumber', value:ln.lotNumber, sev:'REF' });
      }
    }
  }

  if (coll==='productionOrders'){
    if (doc?.bomId && !idx.bomId.has(doc.bomId)) v.push({ collection: coll, id, kind:'REF', at:'bomId', value:doc.bomId, sev:'REF' });
    // sku debe existir en products
    if (doc?.sku && !idx.productSku.has(doc.sku)) v.push({ collection: coll, id, kind:'REF', at:'sku', value:doc.sku, sev:'REF' });
    if (doc?.lotId && !idx.lot.has(doc.lotId)) v.push({ collection: coll, id, kind:'REF', at:'lotId', value:doc.lotId, sev:'REF' });
  }

  if (coll==='goodsReceipts'){
    for (const ln of (doc?.lines ?? [])){
      if (ln?.materialId && !idx.materialId.has(ln.materialId)){
        v.push({ collection: coll, id, kind:'REF', at:'lines[].materialId', value:ln.materialId, sev:'REF' });
      }
    }
  }

  if (coll==='financeLinks'){
    if (!isEUR(doc?.currency)) v.push({ collection: coll, id, kind:'FORMAT', at:'currency', value:doc?.currency, expected:'EUR', sev:'FORMAT' });
    if (doc?.grossAmount!=null && !nonNeg(doc.grossAmount)) v.push({ collection: coll, id, kind:'RANGE', at:'grossAmount', value:doc.grossAmount, sev:'RANGE' });
    if (doc?.issueDate && !isISODate(doc.issueDate)) v.push({ collection: coll, id, kind:'FORMAT', at:'issueDate', value:doc.issueDate, sev:'FORMAT' });
    if (doc?.dueDate && !isISODate(doc.dueDate)) v.push({ collection: coll, id, kind:'FORMAT', at:'dueDate', value:doc.dueDate, sev:'FORMAT' });
  }

  if (coll==='posTactics'){
    if (typeof doc?.executionScore==='number' && !isPct(doc.executionScore)){
      v.push({ collection: coll, id, kind:'RANGE', at:'executionScore', value:doc.executionScore, sev:'RANGE' });
    }
    for (const it of (doc?.items ?? [])){
      if (it?.actualCost!=null && !nonNeg(it.actualCost)) v.push({ collection: coll, id, kind:'RANGE', at:'items[].actualCost', value:it.actualCost, sev:'RANGE' });
    }
  }

  return v;
}


type KpiReadiness = Record<string, { ok: boolean; missing: string[] }>;

// =====================================================
// COMPONENTES DE UI
// =====================================================

function ResultCard({ title, violations, icon: Icon, color }: { title: string, violations: Violation[], icon: React.ElementType, color: string }) {
    const hasIssues = violations.length > 0;
    return (
        <SBCard title="">
             <div className={`p-4 border-b ${hasIssues ? `border-${color}-200 bg-${color}-50` : 'border-zinc-200 bg-zinc-50'}`}>
                <div className={`flex items-center gap-2 font-semibold ${hasIssues ? `text-${color}-800` : 'text-zinc-800'}`}>
                    <Icon size={18} className="sb-icon" />
                    {title}
                    <span className={`px-2 py-0.5 text-xs rounded-full ${hasIssues ? `bg-${color}-200` : 'bg-zinc-200'}`}>{violations.length}</span>
                </div>
            </div>
            <div className="p-4 text-xs space-y-2 max-h-48 overflow-y-auto">
                {hasIssues ? violations.map((v, i) => (
                    <div key={i} className="p-2 bg-white border rounded-md">
                        <p><span className="font-semibold">{v.collection} / Doc:</span> <code className="text-xs">{v.id}</code></p>
                        {v.key && <p><span className="font-semibold">Clave desconocida:</span> {v.key}</p>}
                        {v.at && <p><span className="font-semibold">Campo:</span> {v.at} | <span className="font-semibold">Valor:</span> &quot;{String(v.value)}&quot;</p>}
                    </div>
                )) : <p className="text-zinc-500 text-center py-4">¡Todo en orden!</p>}
            </div>
        </SBCard>
    );
}

function KpiCard({ name, readiness }: { name: string; readiness: KpiReadiness[string] }) {
    return (
        <div className={`p-4 border rounded-lg ${readiness.ok ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <h4 className="font-semibold flex items-center gap-2">
                {readiness.ok ? <CheckCircle size={16} className="sb-icon text-green-600" /> : <ShieldAlert size={16} className="sb-icon text-amber-600" />}
                {name}
            </h4>
            {!readiness.ok && (
                <div className="text-xs mt-2 space-y-1">
                    {readiness.missing.length > 0 && <p><strong className="text-amber-800">Faltan campos:</strong> {readiness.missing.join(', ')}</p>}
                </div>
            )}
        </div>
    );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function SchemaAuditPage() {
    const { data } = useData();

    const report = useMemo(() => {
        const violations: ViolationX[] = [];
        const kpiReadiness: Record<string, { ok: boolean; missing: string[] }> = {};
        let scannedDocs = 0;

        if (!data) return { violations, kpiReadiness, scannedDocs };

        // Índices para FKs
        const idx = buildIndexes(data);

        // A) Unknown keys + enums + required + formatos/rangos/refs
        for (const coll of Array.from(SANTA_DATA_COLLECTIONS) as (keyof SantaData)[]){
            const arr = (data as any)[coll] as any[] | undefined;
            if (!Array.isArray(arr)) continue;
            const allowed = ALLOWED_KEYS[coll];

            for (const doc of arr){
            scannedDocs++;
            const id = doc?.id || doc?.code || undefined;

            // unknown keys
            if (allowed){
                for (const k of Object.keys(doc)){
                if (!allowed.includes(k)) violations.push({ collection: coll, id, kind:'UNKNOWN_KEY', key:k, sev:'UNKNOWN_KEY' });
                }
            }

            // enum checks
            const specs = (ENUM_CHECKS[coll] || []);
            for (const s of specs){
                const v = s.path.split('.').reduce((a,k)=> (a? a[k] : undefined), doc);
                if (v === undefined || v === null) continue;
                const set = ENUMS[s.enum];
                if (set && !set.has(v)) violations.push({ collection: coll, id, kind:'ENUM', at:s.path, expected:s.enum, value:v, sev:'ENUM' });
            }

            // required/format/range/fk checks
            violations.push(...auditDocument(coll, doc, idx));
            }
        }

        // B) KPI readiness — ahora sobre el nuevo `KPI_TRACE`
        for (const [kpiId, meta] of Object.entries(KPI_TRACE)){
            const missing: string[] = [];
            for (const need of meta.needs){
            const sample = ((data as any)[need.coll] as any[])?.[0];
            for (const f of need.fields){
                const val = f.split('.').reduce((a,k)=> (a? a[k] : undefined), sample);
                if (val === undefined) missing.push(`${String(need.coll)}.${f}`);
            }
            }
            kpiReadiness[kpiId] = { ok: missing.length === 0, missing };
        }

        return { violations, kpiReadiness, scannedDocs };
    }, [data]);


    const handleExport = () => {
        const exportData = {
            auditTimestamp: new Date().toISOString(),
            kpiReadiness: report.kpiReadiness,
            violations: report.violations,
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `schema_audit_${new Date().toISOString()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    if (!data) return <div className="p-6">Cargando datos para auditoría...</div>;
    
    const violationsByCollection = report.violations.reduce((acc, v) => {
        if (!acc[v.collection]) acc[v.collection] = [];
        acc[v.collection].push(v);
        return acc;
    }, {} as Record<keyof SantaData, Violation[]>);

    return (
        <>
            <ModuleHeader title="Auditoría de Esquema (SSOT)" icon={BadgeCheck} />
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-zinc-600">Detecta inconsistencias de datos contra el Single Source of Truth.</p>
                    </div>
                    <SBButton onClick={handleExport}>
                        <FileJson size={16} className="sb-icon" /> Exportar Resultados
                    </SBButton>
                </div>
                
                <SBCard title="Trazabilidad y Readiness de KPIs">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(report.kpiReadiness).map(([name, readiness]) => (
                           <KpiCard key={name} name={KPI_TRACE[name]?.label || name} readiness={readiness} />
                        ))}
                    </div>
                </SBCard>

                {report.violations.length > 0 ? (
                    Object.entries(violationsByCollection).map(([collection, violations]) => (
                        <div key={collection} className="p-4 border rounded-xl bg-white">
                            <h3 className="font-bold text-lg mb-4 capitalize">{collection} <span className="text-sm font-normal text-zinc-500">({violations.length} problemas)</span></h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <ResultCard title="Claves Desconocidas" violations={violations.filter(v => v.kind === 'UNKNOWN_KEY')} icon={ShieldAlert} color="red" />
                                <ResultCard title="Violaciones de Enum/Formato/Rango" violations={violations.filter(v => ['ENUM', 'FORMAT', 'RANGE'].includes(v.kind))} icon={ShieldAlert} color="amber" />
                                <ResultCard title="Claves Requeridas Faltantes" violations={violations.filter(v => v.kind === 'MISSING_KEY')} icon={ShieldAlert} color="red" />
                                <ResultCard title="Referencias Rotas (FK)" violations={violations.filter(v => v.kind === 'REF')} icon={ShieldAlert} color="purple" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-12 text-center border-2 border-dashed rounded-2xl text-green-700 bg-green-50">
                        <CheckCircle size={48} className="sb-icon mx-auto mb-4" />
                        <h3 className="text-xl font-bold">¡Todo correcto!</h3>
                        <p>No se encontraron violaciones de esquema en las colecciones de datos ({report.scannedDocs} documentos analizados).</p>
                    </div>
                )}
            </div>
        </>
    );
}
