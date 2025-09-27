
"use client";

/* ============================================================================
 * /quality/traceability — Timeline e2e + Genealogía + Resumen
 * Integrado con SSOT. Acento Calidad (amarillo SB) y badges SB.
 * ==========================================================================*/

import React, { useMemo, useState } from "react";
import { SBCard } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import {
  Search, Share2, Truck, Package, FlaskConical, AlertTriangle,
  ClipboardCheck, GitBranch, MoveRight
} from "lucide-react";
import type {
  Lot, LotNumber, StockMove, LotGenealogyEdge, ProductionOrder,
  QcTest, QcBatchResult, Inspection, GoodsReceipt, Shipment, Item, ProtocolAcknowledgement, Incident, QcPoint, QcStatus
} from "@/domain/ssot";

/* =========================
 * Util: formato de fechas (Europe/Madrid) + fallback
 * ========================= */
function fmt(at?: string) {
  if (!at) return "—";
  const d = new Date(at);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/* =========================
 * Helpers UI
 * ========================= */
function Badge({ children, tone = "info", className = "" }: { children: React.ReactNode; tone?: "info"|"ok"|"warn"|"danger"|"calidad"; className?: string }) {
  const toneClass =
    tone === "ok" ? "sb-badge sb-badge--ok" :
    tone === "warn" ? "sb-badge sb-badge--warn" :
    tone === "danger" ? "sb-badge sb-badge--danger" :
    tone === "calidad" ? "sb-badge sb-badge--calidad" :
    "sb-badge sb-badge--info";
  return <span className={`${toneClass} ${className}`}>{children}</span>;
}

type TraceEventKind =
  | "RECEIPT" | "MOVE" | "ADJUSTMENT" | "SCRAP"
  | "PRODUCTION_CONSUMPTION" | "PRODUCTION_OUTPUT"
  | "QC_TEST" | "QC_DECISION" | "PROTOCOL_ACK"
  | "INCIDENT" | "SHIPMENT";

type RefType = "lot"|"order"|"receipt"|"shipment"|"inspection"|"protocol"|"test"|"txn";

type TraceEvent = {
  id: string;
  at: string; // ISO
  kind: TraceEventKind;
  title: string;
  details?: string;
  refs?: Array<{ type: RefType; id: string }>;
  qty?: number; uom?: string; locationFrom?: string; locationTo?: string;
  qc?: { point?: QcPoint; status?: string; decision?: string };
  severity?: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
};

function kindIcon(kind: TraceEvent["kind"]) {
  switch (kind) {
    case "RECEIPT": return <Package size={14} className="sb-icon" aria-hidden />;
    case "SHIPMENT": return <Truck size={14} className="sb-icon" aria-hidden />;
    case "QC_TEST": return <FlaskConical size={14} className="sb-icon" aria-hidden />;
    case "QC_DECISION": return <FlaskConical size={14} className="sb-icon sb-icon--ok" aria-hidden />;
    case "PROTOCOL_ACK": return <ClipboardCheck size={14} className="sb-icon" aria-hidden />;
    case "INCIDENT": return <AlertTriangle size={14} className="sb-icon sb-icon--warn" aria-hidden />;
    case "MOVE": return <Share2 size={14} className="sb-icon" aria-hidden />;
    case "ADJUSTMENT": return <Share2 size={14} className="sb-icon" aria-hidden />;
    case "PRODUCTION_CONSUMPTION": return <Share2 size={14} className="sb-icon" aria-hidden />;
    case "PRODUCTION_OUTPUT": return <Share2 size={14} className="sb-icon" aria-hidden />;
    default: return <Share2 size={14} className="sb-icon" aria-hidden />;
  }
}

function qcStatusTone(s?: string): "ok"|"warn"|"danger"|"info" {
  if (!s) return "info";
  if (s === "PASSED" || s === "RELEASED") return "ok";
  if (s === "WAIVED" || s === "CONDITIONAL_RELEASE") return "warn";
  if (s === "FAILED" || s === "REJECTED") return "danger";
  return "info";
}

/* =========================
 * Util: construir refs evitando undefined
 * ========================= */
function makeRefs(list: Array<{ type: RefType; id?: string | null | undefined }>): { type: RefType; id: string }[] {
  const out: { type: RefType; id: string }[] = [];
  for (const it of list) if (it?.id) out.push({ type: it.type, id: String(it.id) });
  return out;
}

/* =========================
 * Normalizadores a TraceEvent[]
 * ========================= */
function normalizeEvents(params: {
  lotNumbers?: Set<LotNumber>;
  items: Item[];
  lots: Lot[];
  stockMoves: StockMove[];
  orders: ProductionOrder[];
  lotGenealogy: LotGenealogyEdge[];
  qcTests: QcTest[];
  qcBatchResults: QcBatchResult[];
  inspections: Inspection[];
  incidents: Incident[];
  protocolAcks: ProtocolAcknowledgement[];
  shipments: Shipment[];
  receipts: GoodsReceipt[];
}): TraceEvent[] {
  const {
    lotNumbers, items, lots, stockMoves, orders, lotGenealogy,
    qcTests, qcBatchResults, inspections, incidents, protocolAcks, shipments, receipts
  } = params;

  const includeLot = (ln?: string | null) => !lotNumbers || (!!ln && lotNumbers.has(ln as LotNumber));
  const itemUom = (itemId?: string | null) => (items.find(i => i.id === itemId)?.uom) ?? "";

  const evs: TraceEvent[] = [];

  // 1) Libro mayor de stock
  for (const t of stockMoves) {
    if (!includeLot(t.lotNumber)) continue;

    let k: TraceEventKind;
    switch (t.reason) {
      case "receipt":
      case "return_in": k = "RECEIPT"; break;
      case "transfer": k = "MOVE"; break;
      case "adjustment": k = "ADJUSTMENT"; break;
      case "production_out": k = "PRODUCTION_CONSUMPTION"; break;
      case "production_in": k = "PRODUCTION_OUTPUT"; break;
      case "ship": k = "SHIPMENT"; break;
      case "return_out":
      case "sample_consume": k = "SCRAP"; break;
      default: k = "ADJUSTMENT";
    }

    const orderId = (t as any)?.ref?.prodOrderId ?? (t as any)?.ref?.orderId;
    const baseRefs = makeRefs([
      { type: "txn", id: t.id },
      { type: "lot", id: t.lotNumber },
      { type: "order", id: orderId }
    ]);

    evs.push({
      id: `txn:${t.id}`,
      at: t.occurredAt ?? t.createdAt ?? new Date().toISOString(),
      kind: k,
      title:
        k === "RECEIPT" ? "Recepción / Entrada" :
        k === "MOVE" ? "Movimiento de ubicación" :
        k === "ADJUSTMENT" ? "Ajuste de inventario" :
        k === "PRODUCTION_CONSUMPTION" ? `Consumo para orden ${orderId ?? ""}` :
        k === "PRODUCTION_OUTPUT" ? `Salida de producción ${orderId ?? ""}` :
        k === "SHIPMENT" ? "Expedición" :
        "Baja / Merma",
      details: (t as any)?.ref?.shipmentId
        ? `Envío ${(t as any).ref.shipmentId}`
        : (t as any)?.ref?.goodsReceiptId
          ? `Recepción ${(t as any).ref.goodsReceiptId}`
          : t.reason,
      refs: baseRefs,
      qty: t.qty,
      uom: (t as any)?.uom ?? itemUom((t as any)?.itemId),
      locationFrom: (t as any).fromLocationId ?? (t as any).fromLocation,
      locationTo: (t as any).toLocationId ?? (t as any).toLocation,
    });
  }

  // 2) Genealogía
  for (const edge of lotGenealogy) {
    const ord = orders.find(o => o.id === edge.orderId);
    const outTime =
      (ord as any)?.execution?.finishedAt ??
      (ord as any)?.finishedAt ??
      lots.find(l => l.lotNumber === edge.childLot)?.createdAt ??
      new Date().toISOString();

    if (includeLot(edge.childLot)) {
      evs.push({
        id: `gen:${edge.id}`,
        at: outTime,
        kind: "PRODUCTION_OUTPUT",
        title: "Salida de producción (genealogía)",
        details: `Orden ${edge.orderId}`,
        refs: makeRefs([
          { type:"order", id: edge.orderId },
          { type:"lot", id: edge.childLot },
          { type:"lot", id: edge.parentLot }
        ]),
        qty: edge.qty,
        uom: edge.uom ?? itemUom(lots.find(l=>l.lotNumber===edge.childLot)?.itemId),
      });
    }
    if (includeLot(edge.parentLot)) {
      evs.push({
        id: `genC:${edge.id}`,
        at: outTime,
        kind: "PRODUCTION_CONSUMPTION",
        title: "Consumo en producción (genealogía)",
        details: `Hacia lote ${edge.childLot} (orden ${edge.orderId})`,
        refs: makeRefs([
          { type:"order", id: edge.orderId },
          { type:"lot", id: edge.parentLot },
          { type:"lot", id: edge.childLot }
        ]),
        qty: edge.qty,
        uom: edge.uom ?? itemUom(lots.find(l=>l.lotNumber===edge.parentLot)?.itemId),
      });
    }
  }

  // 3) Inspecciones/Checklist
  for (const ins of inspections) {
    if (lotNumbers) {
      const touchesLot = ins.entity?.kind === "lot" && ins.entity?.id && lotNumbers.has(ins.entity.id as LotNumber);
      const touchesOrder = ins.entity?.kind === "order" && ins.entity?.id && orders.some(o => o.id === ins.entity!.id);
      if (!touchesLot && !touchesOrder) continue;
    }
    evs.push({
      id: `ins:${ins.id}`,
      at: ins.updatedAt ?? ins.createdAt ?? new Date().toISOString(),
      kind: ins.point === "PRE_PROD" ? "PROTOCOL_ACK" : "QC_TEST",
      title: ins.point === "PRE_PROD" ? "Checklist / Protocolo" : `Inspección ${ins.point}`,
      details: ins.status,
      refs: makeRefs([{ type: (ins.entity?.kind as RefType) ?? "inspection", id: ins.entity?.id ?? ins.id }]),
      qc: { point: ins.point, status: ins.status, decision: (ins as any).decision },
    });
  }

  // 4) Tests QC
  for (const t of qcTests) {
    const ln = t.lotNumber;
    if (lotNumbers && ln && !lotNumbers.has(ln)) continue;
    const detail =
      t.valueNumeric != null ? `Valor: ${t.valueNumeric} ${t.unit ?? ""}` :
      t.valueText ? `Valor: ${t.valueText}` :
      t.valueBool != null ? `Valor: ${t.valueBool ? "Sí" : "No"}` : "";
    evs.push({
      id: `qct:${t.id}`,
      at: t.testedAt ?? new Date().toISOString(),
      kind: "QC_TEST",
      title: `Test ${t.parameterId}`,
      details: detail,
      refs: makeRefs([
        { type:"lot", id: ln },
        { type:"order", id: t.orderId }
      ]),
    });
  }

  // 5) Decisiones QC
  for (const r of qcBatchResults) {
    const ln = r.lotNumber;
    if (lotNumbers && ln && !lotNumbers.has(ln)) continue;
    evs.push({
      id: `qcr:${r.id}`,
      at: r.reviewedAt ?? new Date().toISOString(),
      kind: "QC_DECISION",
      title: `Decisión QC: ${r.status}`,
      details: r.remarks ?? "",
      refs: makeRefs([
        { type:"lot", id: ln },
        { type:"order", id: r.orderId }
      ]),
      qc: { decision: r.status },
    });
  }

  // 6) Protocol Acks explícitos
  for (const a of protocolAcks) {
    const ord = orders.find(o => o.id === a.orderId);
    const ln = ord?.lotNumber;
    if (lotNumbers && ln && !lotNumbers.has(ln)) continue;
    evs.push({
      id: `ack:${a.id}`,
      at: a.at ?? new Date().toISOString(),
      kind: "PROTOCOL_ACK",
      title: "Protocolo confirmado",
      details: `Protocol ${a.protocolId} · user ${a.acknowledgedByUserId}`,
      refs: makeRefs([{ type:"order", id: a.orderId }]),
      qc: { point: "PRE_PROD", status: "ACK" },
    });
  }

  // 7) Incidencias
  for (const z of incidents) {
    if (lotNumbers && z.lotNumber && !lotNumbers.has(z.lotNumber)) continue;
    evs.push({
      id: `inc:${z.id}`,
      at: z.at ?? new Date().toISOString(),
      kind: "INCIDENT",
      title: `Incidencia (${z.severity ?? "LOW"})`,
      details: z.summary,
      refs: makeRefs([
        { type:"lot", id: z.lotNumber },
        { type:"order", id: z.orderId }
      ]),
      severity: z.severity as any,
    });
  }

  // 8) Recepciones
  for (const r of receipts) {
    const touches = (r.lines ?? []).some(ln => includeLot(ln.lotNumber));
    if (lotNumbers && !touches) continue;
    evs.push({
      id: `rcp:${r.id}`,
      at: r.receivedAt ?? new Date().toISOString(),
      kind: "RECEIPT",
      title: `Recepción proveedor`,
      details: r.deliveryNote ?? "",
      refs: makeRefs([{ type:"receipt", id:r.id }]),
    });
  }

  // 9) Envíos
  for (const s of shipments) {
    const touches = (s.lines ?? []).some(ln => includeLot(ln.lotNumber));
    if (lotNumbers && !touches) continue;
    evs.push({
      id: `shp:${s.id}`,
      at: s.updatedAt ?? s.createdAt ?? new Date().toISOString(),
      kind: "SHIPMENT",
      title: `Expedición a ${s.customerName ?? s.accountId ?? "cliente"}`,
      details: (s as any).trackingCode ?? (s as any).tracking ?? "",
      refs: makeRefs([{ type:"shipment", id:s.id }]),
    });
  }

  evs.sort((a,b)=> new Date(a.at).getTime() - new Date(b.at).getTime());
  return evs;
}

/* =========================
 * Genealogía (padres/hijos) de los lotes en foco
 * ========================= */
function computeGenealogy(lotNumbers: Set<LotNumber> | undefined, edges: LotGenealogyEdge[]) {
  const parents = new Map<LotNumber, Set<LotNumber>>();
  const children = new Map<LotNumber, Set<LotNumber>>();

  for (const e of edges) {
    if (lotNumbers && !(lotNumbers.has(e.parentLot) || lotNumbers.has(e.childLot))) continue;
    if (!parents.has(e.childLot)) parents.set(e.childLot, new Set());
    parents.get(e.childLot)!.add(e.parentLot);

    if (!children.has(e.parentLot)) children.set(e.parentLot, new Set());
    children.get(e.parentLot)!.add(e.childLot);
  }
  return { parents, children };
}

/* =========================
 * Página principal
 * ========================= */
export default function TraceabilityPage() {
  const { data } = useData();

  const items = (data?.items ?? []) as Item[];
  const lots = (data?.lots ?? []) as Lot[];
  const stockMoves = (data?.stockMoves ?? []) as StockMove[];
  const orders = (data?.productionOrders ?? []) as ProductionOrder[];
  const lotGenealogy = (data?.lotGenealogy ?? []) as LotGenealogyEdge[];
  const qcTests = (data?.qcTests ?? []) as QcTest[];
  const qcBatchResults = (data?.qcBatchResults ?? []) as QcBatchResult[];
  const inspections = (data?.inspections ?? []) as Inspection[];
  const incidents = (data?.incidents ?? []) as Incident[];
  const protocolAcks = (data?.protocolAcks ?? []) as ProtocolAcknowledgement[];
  const shipments = (data?.shipments ?? []) as Shipment[];
  const receipts = (data?.goodsReceipts ?? []) as GoodsReceipt[];

  // Control de foco
  const [focusKind, setFocusKind] = useState<"lot"|"order"|"shipment"|"receipt">("lot");
  const [query, setQuery] = useState("");

  // Sugerencias para el datalist
  const lotIds = useMemo(()=> lots.map(l => l.lotNumber).filter(Boolean) as string[], [lots]);
  const orderIds = useMemo(()=> orders.map(o => o.id), [orders]);
  const shipmentIds = useMemo(()=> shipments.map(s => s.id), [shipments]);
  const receiptIds = useMemo(()=> receipts.map(r => r.id), [receipts]);

  // Resolver lot(es) en foco desde la selección
  const focusedLots: Set<LotNumber> | undefined = useMemo(() => {
    const id = query.trim();
    if (!id) return undefined;

    if (focusKind === "lot") return new Set<LotNumber>([id]);

    if (focusKind === "order") {
      const o = orders.find(x => x.id === id);
      const acc = new Set<LotNumber>();
      if ((o as any)?.batchCode) acc.add((o as any).batchCode);
      if ((o as any)?.lotNumber) acc.add((o as any).lotNumber);
      return acc.size ? acc : undefined;
    }

    if (focusKind === "shipment") {
      const s = shipments.find(x => x.id === id);
      const acc = new Set<LotNumber>();
      (s?.lines ?? []).forEach(ln => ln?.lotNumber && acc.add(ln.lotNumber));
      return acc.size ? acc : undefined;
    }

    if (focusKind === "receipt") {
      const r = receipts.find(x => x.id === id);
      const acc = new Set<LotNumber>();
      (r?.lines ?? []).forEach(ln => ln?.lotNumber && acc.add(ln.lotNumber));
      return acc.size ? acc : undefined;
    }

    return undefined;
  }, [focusKind, query, orders, shipments, receipts]);

  const events = useMemo(() => normalizeEvents({
    lotNumbers: focusedLots,
    items, lots, stockMoves, orders, lotGenealogy,
    qcTests, qcBatchResults, inspections, incidents, protocolAcks, shipments, receipts
  }), [focusedLots, items, lots, stockMoves, orders, lotGenealogy, qcTests, qcBatchResults, inspections, incidents, protocolAcks, shipments, receipts]);

  const { parents, children } = useMemo(
    () => computeGenealogy(focusedLots, lotGenealogy),
    [focusedLots, lotGenealogy]
  );

  // Resumen rápido (si 1 solo lote)
  const singleLot = useMemo(() => {
    if (!focusedLots || focusedLots.size !== 1) return null;
    const ln = Array.from(focusedLots)[0];
    return lots.find(l => l.lotNumber === ln) || null;
  }, [focusedLots, lots]);

  const lotUom = (l?: Lot | null) => items.find(i => i.id === l?.itemId)?.uom ?? "";

  return (
    <div className="mx-auto max-w-screen-2xl p-6 space-y-6">
      <SBCard
        title={
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-xl font-semibold text-zinc-800">Trazabilidad — seguimiento end-to-end</h2>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="sr-only" htmlFor="focusKind">Tipo de búsqueda</label>
              <select id="focusKind" className="h-10 border rounded-lg px-2 text-sm bg-white"
                      value={focusKind} onChange={e=>setFocusKind(e.target.value as any)}>
                <option value="lot">Lote</option>
                <option value="order">Orden</option>
                <option value="shipment">Envío</option>
                <option value="receipt">Recepción</option>
              </select>

              <div className="relative flex-1 min-w-64">
                 <Search size={16} className="text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                 <input
                  list="trace-ids"
                  className="h-10 border rounded-lg px-3 pl-9 w-full text-sm bg-white"
                  placeholder={`Buscar por ID de ${focusKind}…`}
                  value={query}
                  onChange={e=>setQuery(e.target.value)}
                  aria-label={`Buscar por identificador de ${focusKind}`}
                />
                <datalist id="trace-ids">
                  {(focusKind==="lot" ? lotIds
                    : focusKind==="order" ? orderIds
                    : focusKind==="shipment" ? shipmentIds
                    : receiptIds).slice(0,200).map(v => <option key={v} value={v} />)}
                </datalist>
              </div>
            </div>
          </div>
        }
        accent="hsl(var(--sb-sun-strong))"
      >
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 p-4">
          {/* Timeline */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Timeline</h3>
            {(!focusedLots || events.length === 0) ? (
              <div className="p-10 text-zinc-500 text-sm text-center border-2 border-dashed rounded-xl">
                Introduce un identificador para ver la trazabilidad.
              </div>
            ) : (
              <ol className="relative border-s ml-2" role="list" aria-label="Timeline de eventos de trazabilidad">
                {events.map((ev) => (
                  <li key={ev.id} className="mb-6 ms-4">
                    <div className="absolute w-3 h-3 bg-white rounded-full -start-1.5 border" aria-hidden />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 mb-1">
                      <time dateTime={ev.at}>{fmt(ev.at)}</time>
                      <Badge tone="calidad">
                        <span className="inline-flex items-center gap-1">
                          {kindIcon(ev.kind)}<span className="uppercase tracking-wide">{ev.kind.replaceAll("_"," ")}</span>
                        </span>
                      </Badge>
                      {ev.qc?.point && <Badge>{ev.qc.point}</Badge>}
                      {ev.qc?.decision && <Badge tone={qcStatusTone(ev.qc.decision)}>{ev.qc.decision}</Badge>}
                      {ev.severity && <Badge tone={ev.severity==="HIGH"||ev.severity==="CRITICAL"?"danger":"warn"}>INC {ev.severity}</Badge>}
                    </div>

                    <div className="font-medium">{ev.title}</div>
                    {ev.details && <div className="text-sm text-zinc-700">{ev.details}</div>}

                    <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {ev.qty!=null && (
                        <span>Qty: <b>{ev.qty}</b> {ev.uom ?? ""}</span>
                      )}
                      {(ev.locationFrom || ev.locationTo) && (
                        <span className="inline-flex items-center gap-1">
                          <MoveRight size={12} aria-hidden /> {ev.locationFrom ?? "—"} → {ev.locationTo ?? "—"}
                        </span>
                      )}
                      {ev.refs?.map(r => (
                        <a key={`${r.type}:${r.id}`} className="underline text-sky-700"
                           href={
                             r.type==="lot" ? `/lots/${encodeURIComponent(r.id)}/dossier` :
                             r.type==="order" ? `/production/orders/${encodeURIComponent(r.id)}` :
                             r.type==="shipment" ? `/shipments/${encodeURIComponent(r.id)}` :
                             r.type==="receipt" ? `/receiving/${encodeURIComponent(r.id)}` :
                             `/inspections/${encodeURIComponent(r.id)}`
                           }>
                          {r.type}:{r.id}
                        </a>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Lateral derecho: Resumen + Genealogía */}
          <div className="space-y-6">
            <SBCard title="Lotes disponibles (debug rápido)">
              <div className="sb-card__content space-y-1 text-xs font-mono max-h-48 overflow-y-auto">
                {(data?.lots || []).length
                  ? (data!.lots as Lot[]).map(l => <div key={l.id}>{l.lotNumber}</div>)
                  : <div className="font-sans text-sm text-zinc-500">No hay lotes en la base de datos.</div>}
              </div>
            </SBCard>

            <SBCard title="Resumen del foco">
              <div className="sb-card__content text-sm">
                {!focusedLots && <div className="text-zinc-500">Selecciona un identificador para ver el resumen.</div>}

                {/* Resumen 1 lote */}
                {singleLot && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{singleLot.lotNumber}</span>
                      <Badge tone={qcStatusTone(singleLot.qcStatus)}>
                        QC {singleLot.qcStatus ?? "PENDING"}
                      </Badge>
                    </div>
                    <div className="text-zinc-600">
                      Item: {singleLot.itemId} · Disponible: {singleLot.quantity} {lotUom(singleLot)}
                    </div>
                    <div className="text-zinc-600">
                      Estado: {singleLot.status ?? "OPEN"} {singleLot.locationId ? `· Ubicación: ${singleLot.locationId}` : ""}
                    </div>
                  </div>
                )}

                {/* Resumen varios lotes */}
                {focusedLots && !singleLot && (
                  <div className="space-y-2">
                    {Array.from(focusedLots).map(ln => {
                      const l = lots.find(x => x.lotNumber === ln);
                      if (!l) return (
                        <div key={ln} className="border rounded-lg p-2">
                          <div className="font-medium">{ln}</div>
                          <div className="text-xs text-zinc-600">Lote no localizado en datos.</div>
                        </div>
                      );
                      return (
                        <div key={ln} className="border rounded-lg p-2 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{l.lotNumber}</div>
                            <div className="text-xs text-zinc-600">
                              {l.itemId} · {l.quantity} {lotUom(l)} · QC {l.qcStatus ?? "PENDING"}
                            </div>
                          </div>
                          <a className="text-sky-700 text-sm underline" href={`/lots/${encodeURIComponent(l.lotNumber)}/dossier`}>Abrir dossier</a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SBCard>

            <SBCard title="Genealogía">
              <div className="sb-card__content space-y-4">
                {(!focusedLots || (parents.size===0 && children.size===0)) && (
                  <div className="text-sm text-zinc-500">No hay relaciones de genealogía para el foco actual.</div>
                )}

                {parents.size>0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <GitBranch size={16} className="sb-icon" aria-hidden/> Upstream (lotes padres)
                    </div>
                    <div className="space-y-1">
                      {Array.from(parents.entries()).map(([child, set])=>(
                        <div key={`p-${child}`} className="text-sm">
                          <span className="font-medium">{child}</span> ⇐ {Array.from(set).map(p=>(
                            <a key={p} className="underline text-sky-700 mr-2" href={`/lots/${encodeURIComponent(p)}/dossier`}>{p}</a>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {children.size>0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <GitBranch size={16} className="sb-icon" aria-hidden/> Downstream (lotes hijos)
                    </div>
                    <div className="space-y-1">
                      {Array.from(children.entries()).map(([parent, set])=>(
                        <div key={`c-${parent}`} className="text-sm">
                          <span className="font-medium">{parent}</span> ⇒ {Array.from(set).map(c=>(
                            <a key={c} className="underline text-sky-700 mr-2" href={`/lots/${encodeURIComponent(c)}/dossier`}>{c}</a>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SBCard>

            <SBCard title="Acciones rápidas">
              <div className="sb-card__content grid grid-cols-2 gap-2">
                {singleLot ? (
                  <>
                    <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href={`/lots/${encodeURIComponent(singleLot.lotNumber)}/dossier`}>Abrir dossier del lote</a>
                    <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/release">Ir a laboratorio</a>
                  </>
                ) : (
                  <>
                    <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/release">Ir a laboratorio</a>
                    <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/parametros">Configurar parámetros</a>
                  </>
                )}
                <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/autocontrol">Ver autocontrol</a>
                <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/dashboard">Dashboard de Calidad</a>
              </div>
            </SBCard>
          </div>
        </div>
      </SBCard>
    </div>
  );
}
