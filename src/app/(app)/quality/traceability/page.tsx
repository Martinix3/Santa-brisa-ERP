"use client";

/* ============================================================================
 * /quality/trazabilidad — Timeline end-to-end + Genealogía + Resumen
 * Integrado con SSOT (tipos reales) y acento azul de calidad.
 * ==========================================================================*/

import React, { useMemo, useState } from "react";
import { SBCard } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import {
  Search, Share2, Truck, Package, FlaskConical, AlertTriangle,
  ClipboardCheck, Diagram3, MoveRight
} from "lucide-react";
import type {
  Lot, LotNumber, InventoryTransaction, InventoryTxnKind, LotGenealogyEdge,
  ProductionOrder, QcTest, QcBatchResult, Incident, ProtocolAcknowledgement
} from "@/domain/ssot";

/* =========================
 * Helpers UI
 * ========================= */
function Badge({ children, tone="zinc" }: { children: React.ReactNode; tone?: "zinc"|"sky"|"amber"|"rose"|"emerald" }) {
  const color = {
    zinc: "border-zinc-200 bg-white text-zinc-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border ${color}`}>{children}</span>;
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
  qc?: { point?: "PRE_PROD"|"IPQC"|"FINAL_QC"; status?: string; decision?: string };
  severity?: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
};

function kindIcon(kind: TraceEvent["kind"]) {
  switch (kind) {
    case "RECEIPT": return <Package size={14} />;
    case "SHIPMENT": return <Truck size={14} />;
    case "QC_TEST": return <FlaskConical size={14} />;
    case "QC_DECISION": return <FlaskConical size={14} />;
    case "PROTOCOL_ACK": return <ClipboardCheck size={14} />;
    case "INCIDENT": return <AlertTriangle size={14} />;
    default: return <Share2 size={14} />;
  }
}

function qcStatusTone(s?: string): "emerald"|"amber"|"rose"|"zinc" {
  if (!s) return "zinc";
  if (s === "PASSED" || s === "RELEASED") return "emerald";
  if (s === "WAIVED" || s === "CONDITIONAL_RELEASE") return "amber";
  if (s === "FAILED" || s === "REJECTED") return "rose";
  return "zinc";
}

/* =========================
 * Normalizadores a TraceEvent[]
 * ========================= */
function normalizeEvents(params: {
  lotNumbers?: Set<LotNumber>;         // si no se pasa → muestra todo (pero en UI pedimos foco)
  lots: Lot[];
  inventoryTxns: InventoryTransaction[];
  orders: ProductionOrder[];
  lotGenealogy: LotGenealogyEdge[];
  qcTests: QcTest[];
  qcBatchResults: QcBatchResult[];
  incidents: Incident[];
  protocolAcks: ProtocolAcknowledgement[];
  shipments: any[];    // estructura: { id, accountName, shippedAt?, createdAt?, lines:[{lotNumber, qty, uom}] }
  receipts: any[];     // estructura: { id, supplierName, createdAt, receivedLots:[{lotNumber, qty, uom}] }
}): TraceEvent[] {
  const {
    lotNumbers, lots, inventoryTxns, orders, lotGenealogy,
    qcTests, qcBatchResults, incidents, protocolAcks, shipments, receipts
  } = params;

  const includeLot = (ln?: string) => !lotNumbers || (ln && lotNumbers.has(ln));

  const evs: TraceEvent[] = [];

  // 1) Inventario (RECEIPT / MOVE / ADJUSTMENT / CONSUMPTION / SCRAP)
  for (const t of inventoryTxns) {
    if (!includeLot(t.lotNumber)) continue;
    const base = {
      id: `txn:${t.id}`,
      at: t.at,
      qty: t.qty,
      uom: t.uom,
      locationFrom: t.fromLocationId,
      locationTo: t.toLocationId,
      refs: [{ type: "txn" as RefType, id: t.id }, { type: "lot" as RefType, id: t.lotNumber }],
      details: t.reason ?? "",
    };
    const kindMap: Record<InventoryTxnKind, TraceEventKind> = {
      RECEIPT: "RECEIPT",
      MOVE: "MOVE",
      ADJUSTMENT: "ADJUSTMENT",
      CONSUMPTION: "PRODUCTION_CONSUMPTION",
      SCRAP: "SCRAP",
    };
    const k = kindMap[t.kind];
    evs.push({
      ...base,
      kind: k,
      title:
        k === "RECEIPT" ? "Recepción / Entrada" :
        k === "MOVE" ? "Movimiento de ubicación" :
        k === "ADJUSTMENT" ? "Ajuste de inventario" :
        k === "PRODUCTION_CONSUMPTION" ? `Consumo para orden ${t.orderId ?? ""}` :
        "Baja / Merma",
      refs: t.orderId ? [...base.refs!, { type:"order", id: t.orderId }] : base.refs,
    });
  }

  // 2) Genealogía → evento de salida de producción (si no queda claro por inventario)
  for (const edge of lotGenealogy) {
    if (includeLot(edge.childLot)) {
      const ord = orders.find(o => o.id === edge.orderId);
      evs.push({
        id: `gen:${edge.id}`,
        at: (ord?.endedAt ?? ord?.createdAt ?? lots.find(l => l.id === edge.childLot)?.createdAt) || new Date().toISOString(),
        kind: "PRODUCTION_OUTPUT",
        title: "Salida de producción",
        details: `Orden ${edge.orderId}`,
        refs: [{ type:"order", id: edge.orderId }, { type:"lot", id: edge.childLot }, { type:"lot", id: edge.parentLot }],
        qty: edge.qty, uom: edge.uom,
      });
    }
    if (includeLot(edge.parentLot)) {
      evs.push({
        id: `genC:${edge.id}`,
        at: new Date((lots.find(l => l.id === edge.parentLot)?.updatedAt ?? lots.find(l => l.id === edge.parentLot)?.createdAt) || Date.now()).toISOString(),
        kind: "PRODUCTION_CONSUMPTION",
        title: "Consumo en producción",
        details: `Hacia lote ${edge.childLot} (orden ${edge.orderId})`,
        refs: [{ type:"order", id: edge.orderId }, { type:"lot", id: edge.parentLot }, { type:"lot", id: edge.childLot }],
        qty: edge.qty, uom: edge.uom,
      });
    }
  }

  // 3) Tests QC individuales
  for (const t of qcTests) {
    const ln = t.lotNumber;
    if (!includeLot(ln)) continue;
    evs.push({
      id: `qct:${t.id}`,
      at: t.at,
      kind: "QC_TEST",
      title: `Test ${t.parameterId}`,
      details:
        t.valueNumeric != null ? `Valor: ${t.valueNumeric} ${t.unit ?? ""}` :
        t.valueText ? `Valor: ${t.valueText}` :
        t.valueBool != null ? `Valor: ${t.valueBool ? "Sí" : "No"}` : "",
      refs: ln ? [{ type:"lot", id: ln }] : t.orderId ? [{ type:"order", id: t.orderId }] : [],
    });
  }

  // 4) Decisiones de lote (QcBatchResult)
  for (const r of qcBatchResults) {
    const ln = r.lotNumber;
    if (!includeLot(ln)) continue;
    evs.push({
      id: `qcr:${r.id}`,
      at: r.testedAt,
      kind: "QC_DECISION",
      title: `Decisión QC: ${r.status}`,
      details: r.remarks ?? "",
      refs: ln ? [{ type:"lot", id: ln }] : r.orderId ? [{ type:"order", id: r.orderId }] : [],
      qc: { decision: r.status },
    });
  }

  // 5) Protocolos (acknowledgements)
  for (const a of protocolAcks) {
    // mapeamos a lot si la order genera ese lot
    const order = orders.find(o => o.id === a.orderId);
    const ln = order?.lotNumber ?? order?.output?.[0]?.lotNumber;
    if (ln && !includeLot(ln)) continue;
    evs.push({
      id: `ack:${a.id}`,
      at: a.at,
      kind: "PROTOCOL_ACK",
      title: `Protocolo confirmado`,
      details: `Protocol ${a.protocolId} por usuario ${a.acknowledgedByUserId}`,
      refs: [{ type:"order", id: a.orderId }],
      qc: { point: "PRE_PROD", status: "ACK" },
    });
  }

  // 6) Incidencias
  for (const z of incidents) {
    if (z.lotNumber && !includeLot(z.lotNumber)) continue;
    evs.push({
      id: `inc:${z.id}`,
      at: z.at,
      kind: "INCIDENT",
      title: `Incidencia (${z.severity})`,
      details: z.summary,
      refs: [
        ...(z.lotNumber ? [{ type:"lot", id: z.lotNumber }] as any : []),
        ...(z.orderId ? [{ type:"order", id: z.orderId }] as any : []),
      ],
      severity: z.severity as any,
    });
  }

  // 7) Recepciones (si existen como entidad aparte)
  for (const r of receipts) {
    const lines = Array.isArray(r.receivedLots) ? r.receivedLots : [];
    const touches = lines.some((ln:any)=> includeLot(ln?.lotNumber));
    if (lotNumbers && !touches) continue;
    evs.push({
      id: `rcp:${r.id}`,
      at: r.createdAt ?? new Date().toISOString(),
      kind: "RECEIPT",
      title: `Recepción proveedor ${r.supplierName ?? ""}`,
      details: r.ref ?? "",
      refs: [{ type:"receipt", id:r.id }],
    });
  }

  // 8) Envíos (si existen)
  for (const s of shipments) {
    const lines = Array.isArray(s.lines) ? s.lines : [];
    const touches = lines.some((ln:any)=> includeLot(ln?.lotNumber));
    if (lotNumbers && !touches) continue;
    evs.push({
      id: `shp:${s.id}`,
      at: s.shippedAt ?? s.createdAt ?? new Date().toISOString(),
      kind: "SHIPMENT",
      title: `Expedición a ${s.accountName ?? s.accountId ?? "cliente"}`,
      details: s.ref ?? "",
      refs: [{ type:"shipment", id:s.id }],
    });
  }

  // Orden temporal
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

  // Lee arrays reales del dataprovider, con fallbacks de nombres
  const lots = (data?.lots ?? []) as Lot[];
  const inventoryTxns = (data?.inventoryTxns ?? data?.inventoryMovements ?? []) as InventoryTransaction[];
  const orders = (data?.productionOrders ?? []) as ProductionOrder[];
  const lotGenealogy = (data?.lotGenealogy ?? []) as LotGenealogyEdge[];
  const qcTests = (data?.qcTests ?? []) as QcTest[];
  const qcBatchResults = (data?.qcBatchResults ?? []) as QcBatchResult[];
  const incidents = (data?.incidents ?? data?.nonconformances ?? []) as Incident[];
  const protocolAcks = (data?.protocolAcks ?? []) as ProtocolAcknowledgement[];
  const shipments = (data?.shipments ?? []) as any[];
  const receipts = (data?.receipts ?? []) as any[];

  // Control de foco
  const [focusKind, setFocusKind] = useState<"lot"|"order"|"shipment"|"receipt">("lot");
  const [query, setQuery] = useState("");

  // Resolver lot(es) en foco desde la selección
  const focusedLots: Set<LotNumber> | undefined = useMemo(() => {
    const id = query.trim();
    if (!id) return undefined;

    if (focusKind === "lot") return new Set<LotNumber>([id]);

    if (focusKind === "order") {
      const o = orders.find(x => x.id === id);
      const lotsOut = new Set<LotNumber>();
      if (o?.lotNumber) lotsOut.add(o.lotNumber);
      (o?.output ?? []).forEach(x => x?.lotNumber && lotsOut.add(x.lotNumber));
      return lotsOut.size ? lotsOut : undefined;
    }

    if (focusKind === "shipment") {
      const s = shipments.find(x => x.id === id);
      const lotsOut = new Set<LotNumber>();
      (s?.lines ?? []).forEach((ln:any)=> ln?.lotNumber && lotsOut.add(ln.lotNumber));
      return lotsOut.size ? lotsOut : undefined;
    }

    if (focusKind === "receipt") {
      const r = receipts.find(x => x.id === id);
      const lotsOut = new Set<LotNumber>();
      (r?.receivedLots ?? []).forEach((ln:any)=> ln?.lotNumber && lotsOut.add(ln.lotNumber));
      return lotsOut.size ? lotsOut : undefined;
    }

    return undefined;
  }, [focusKind, query, orders, shipments, receipts]);

  const events = useMemo(() => normalizeEvents({
    lotNumbers: focusedLots,
    lots, inventoryTxns, orders, lotGenealogy,
    qcTests, qcBatchResults, incidents, protocolAcks, shipments, receipts
  }), [focusedLots, lots, inventoryTxns, orders, lotGenealogy, qcTests, qcBatchResults, incidents, protocolAcks, shipments, receipts]);

  const { parents, children } = useMemo(
    () => computeGenealogy(focusedLots, lotGenealogy),
    [focusedLots, lotGenealogy]
  );

  // Resumen rápido (si 1 solo lote)
  const singleLot = useMemo(() => {
    if (!focusedLots || focusedLots.size !== 1) return null;
    const ln = Array.from(focusedLots)[0];
    return lots.find(l => l.id === ln || l.id === (l as any)?.lotNumber) || null;
  }, [focusedLots, lots]);

  return (
    <div className="mx-auto max-w-screen-2xl p-6 space-y-6">
      <SBCard
        title="Trazabilidad — seguimiento end-to-end"
        accent="hsl(var(--sb-accent-calidad))"
      >
        <div className="p-4 grid md:grid-cols-[160px_1fr_220px] gap-3">
          <div className="flex gap-2">
            <select className="h-10 border rounded-lg px-2" value={focusKind} onChange={e=>setFocusKind(e.target.value as any)}>
              <option value="lot">Lote</option>
              <option value="order">Orden</option>
              <option value="shipment">Envío</option>
              <option value="receipt">Recepción</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Search size={16} className="text-zinc-500" />
            <input
              className="h-10 border rounded-lg px-3 w-full"
              placeholder={`Buscar ${focusKind}…`}
              value={query}
              onChange={e=>setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            {singleLot?.qcStatus && (
              <Badge tone={qcStatusTone(singleLot.qcStatus)}>{singleLot.qcStatus}</Badge>
            )}
            {singleLot?.status && <Badge>{singleLot.status}</Badge>}
          </div>
        </div>
      </SBCard>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* Timeline */}
        <SBCard title="Timeline" accent="hsl(var(--sb-accent-calidad))">
          <div className="p-4">
            {(!focusedLots || events.length === 0) && (
              <div className="p-10 text-zinc-500 text-sm">
                Introduce un identificador (lote / orden / envío / recepción) para ver la trazabilidad.
              </div>
            )}

            {events.length > 0 && (
              <ol className="relative border-s">
                {events.map((ev) => (
                  <li key={ev.id} className="mb-6 ms-4">
                    <div className="absolute w-3 h-3 bg-white rounded-full -start-1.5 border" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 mb-1">
                      <span>{new Date(ev.at).toLocaleString()}</span>
                      <Badge>
                        <span className="inline-flex items-center gap-1">
                          {kindIcon(ev.kind)}{ev.kind}
                        </span>
                      </Badge>
                      {ev.qc?.point && <Badge tone="sky">{ev.qc.point}</Badge>}
                      {ev.qc?.decision && <Badge tone={qcStatusTone(ev.qc.decision)}>{ev.qc.decision}</Badge>}
                      {ev.severity && <Badge tone={ev.severity==="HIGH"||ev.severity==="CRITICAL"?"rose":"amber"}>INC {ev.severity}</Badge>}
                    </div>
                    <div className="font-medium">{ev.title}</div>
                    {ev.details && <div className="text-sm text-zinc-700">{ev.details}</div>}
                    <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                      {ev.qty!=null && <>Cantidad: <b>{ev.qty}</b> {ev.uom ?? ""}</>}
                      {(ev.locationFrom || ev.locationTo) && (
                        <span className="inline-flex items-center gap-1">
                          <MoveRight size={12} /> {ev.locationFrom ?? "—"} → {ev.locationTo ?? "—"}
                        </span>
                      )}
                      {ev.refs?.map(r => (
                        <a key={`${r.type}:${r.id}`} className="underline text-sky-700"
                           href={
                             r.type==="lot" ? `/lots/${r.id}/dossier` :
                             r.type==="order" ? `/production/orders/${r.id}` :
                             r.type==="shipment" ? `/shipments/${r.id}` :
                             r.type==="receipt" ? `/receiving/${r.id}` :
                             `/inspections/${r.id}`
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
        </SBCard>

        {/* Lateral derecho: Resumen + Genealogía */}
        <div className="space-y-6">
          <SBCard title="Resumen del foco" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 text-sm">
              {!focusedLots && <div className="text-zinc-500">Selecciona un identificador para ver el resumen.</div>}

              {/* Resumen cuando hay 1 solo lote */}
              {singleLot && (
                <div className="space-y-1">
                  <div><b>Lote:</b> {singleLot.id}</div>
                  <div className="text-zinc-600">
                    Item: {singleLot.itemName ?? singleLot.itemId} ·
                    {" "}Disponible: {singleLot.qtyOnHand} {singleLot.uom}
                  </div>
                  <div className="text-zinc-600">
                    QC: {singleLot.qcStatus ?? "PENDING"} · Estado: {singleLot.status}
                  </div>
                  {singleLot.locationId && (
                    <div className="text-zinc-600">Ubicación: {singleLot.locationId}</div>
                  )}
                </div>
              )}

              {/* Resumen cuando hay varios lotes */}
              {focusedLots && !singleLot && (
                <div className="space-y-2">
                  {Array.from(focusedLots).map(ln => {
                    const l = lots.find(x => x.id === ln);
                    if (!l) return (
                      <div key={ln} className="border rounded-lg p-2">
                        <div className="font-medium">{ln}</div>
                        <div className="text-xs text-zinc-600">Lote no localizado en datos.</div>
                      </div>
                    );
                    return (
                      <div key={ln} className="border rounded-lg p-2 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{l.id}</div>
                          <div className="text-xs text-zinc-600">
                            {l.itemName ?? l.itemId} · {l.qtyOnHand} {l.uom} · QC {l.qcStatus ?? "PENDING"}
                          </div>
                        </div>
                        <a className="text-sky-700 text-sm underline" href={`/lots/${encodeURIComponent(l.id)}/dossier`}>Abrir dossier</a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SBCard>

          <SBCard title="Genealogía" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 space-y-4">
              {(!focusedLots || (parents.size===0 && children.size===0)) && (
                <div className="text-sm text-zinc-500">No hay relaciones de genealogía para el foco actual.</div>
              )}

              {parents.size>0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Diagram3 size={16}/> Upstream (lotes padres)
                  </div>
                  <div className="space-y-1">
                    {Array.from(parents.entries()).map(([child, set])=>(
                      <div key={`p-${child}`} className="text-sm">
                        <span className="font-medium">{child}</span> ⇐ {Array.from(set).map(p=>(<a key={p} className="underline text-sky-700 mr-2" href={`/lots/${p}/dossier`}>{p}</a>))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {children.size>0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Diagram3 size={16}/> Downstream (lotes hijos)
                  </div>
                  <div className="space-y-1">
                    {Array.from(children.entries()).map(([parent, set])=>(
                      <div key={`c-${parent}`} className="text-sm">
                        <span className="font-medium">{parent}</span> ⇒ {Array.from(set).map(c=>(<a key={c} className="underline text-sky-700 mr-2" href={`/lots/${c}/dossier`}>{c}</a>))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SBCard>

          <SBCard title="Acciones rápidas" accent="hsl(var(--sb-accent-calidad))">
            <div className="p-4 grid grid-cols-2 gap-2">
              {singleLot ? (
                <>
                  <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href={`/lots/${singleLot.id}/dossier`}>Abrir dossier del lote</a>
                  <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/laboratorio">Ir a laboratorio</a>
                </>
              ) : (
                <>
                  <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/laboratorio">Ir a laboratorio</a>
                  <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/parametros">Configurar parámetros</a>
                </>
              )}
              <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality/autocontrol">Ver autocontrol</a>
              <a className="border rounded-lg p-3 text-sm hover:bg-zinc-50" href="/quality">Dashboard de Calidad</a>
            </div>
          </SBCard>
        </div>
      </div>
    </div>
  );
}
