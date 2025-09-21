
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/lib/dataprovider";
import type { Lot, OrderSellOut as SaleDoc, QACheck, ProductionOrder, User, TraceEvent, Account, SantaData } from "@/domain/ssot";
import {
    Archive, FileText, CheckCircle2, XCircle, FlaskConical, Recycle, PackagePlus, Flag,
    Package as PackageIcon, PackageCheck, Truck, Pin, Paperclip, Send, Download,
} from "lucide-react";

// ======================================================================
// SB Trazabilidad — Timeline + Auditoría (solo lectura)
// Integrado al DataProvider central (useData) y tu esquema SSOT
// ======================================================================

// -------------------------- Tipos Locales --------------------------
type GenealogyLink = { fromLotId: string; toLotId: string; };
type LotStatus = Lot['quality']['qcStatus'];


// -------------------------- Utils --------------------------
function buildIndex<T extends { id: string }>(rows: T[] | undefined) {
  const m = new Map<string, T>();
  (rows || []).forEach((r) => m.set(r.id, r));
  return m;
}
function backtrace(links: GenealogyLink[], targetLotId: string): string[] {
  const p = links.filter((l) => l.toLotId === targetLotId).map((l) => l.fromLotId);
  const all = new Set<string>(p);
  for (const x of p) for (const up of backtrace(links, x)) all.add(up);
  return Array.from(all);
}
function forwardtrace(links: GenealogyLink[], sourceLotId: string): string[] {
  const c = links.filter((l) => l.fromLotId === sourceLotId).map((l) => l.toLotId);
  const all = new Set<string>(c);
  for (const x of c) for (const dn of forwardtrace(links, x)) all.add(dn);
  return Array.from(all);
}

// ------------------------------- UI primitives -------------------------------
namespace TraceUI {
  export function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "green" | "red" | "amber" | "blue" }) {
    const map: any = {
      zinc: "bg-zinc-100 text-zinc-800 border border-zinc-200",
      green: "bg-green-100 text-green-800 border border-green-200",
      red: "bg-red-100 text-red-800 border border-red-200",
      amber: "bg-amber-100 text-amber-800 border border-amber-200 border",
      blue: "bg-blue-100 text-blue-800 border-blue-200 border",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${map[tone]}`}>{children}</span>;
  }
  export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <label className="grid grid-cols-3 gap-2 items-center text-sm">
        <span className="text-zinc-500">{label}</span>
        <span className="col-span-2">{children}</span>
      </label>
    );
  }
}
const { Badge, Field } = TraceUI;

function StatusPill({ s }: { s?: LotStatus }) {
    if (!s) return null;
    const toneMap: Record<LotStatus, "green" | "red" | "amber" | "blue" | "zinc"> = {
        'release': 'green',
        'reject': 'red',
        'hold': 'amber',
    };
    const tone = toneMap[s] || 'zinc';
    return <Badge tone={tone as any}>{String(s).toUpperCase()}</Badge>;
}

function PhasePill({ phase }: { phase: TraceEvent["phase"] }) {
  const map: Record<TraceEvent["phase"], string> = {
    SOURCE: "bg-emerald-50 text-emerald-700",
    RECEIPT: "bg-sky-50 text-sky-700",
    QC: "bg-amber-50 text-amber-700",
    PRODUCTION: "bg-purple-50 text-purple-700",
    PACK: "bg-pink-50 text-pink-700",
    WAREHOUSE: "bg-zinc-50 text-zinc-700",
    SALE: "bg-blue-50 text-blue-700",
    DELIVERY: "bg-teal-50 text-teal-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs border ${map[phase]}`}>{phase}</span>;
}

function KindTag({ kind }: { kind: TraceEvent["kind"] }) {
  return <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 text-zinc-700 border border-zinc-200">{kind}</span>;
}

// ----------------брь--------------- Search Bar -------------------------------
function SearchBar({ lots, onPick }: { lots: Lot[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sugs = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [] as { id: string; label: string; aux: string }[];
    const out: { id: string; label: string; aux: string }[] = [];
    for (const l of lots) {
      if (l.id.toLowerCase().includes(query)) out.push({ id: l.id, label: l.id, aux: l.sku });
      if (l.sku && l.sku.toLowerCase().includes(query)) out.push({ id: l.id, label: l.sku, aux: l.id });
    }
    const seen = new Set<string>();
    return out
      .filter((s) => {
        const k = s.id + "|" + s.label;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  }, [lots, q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder="Buscar por código de lote o SKU…"
        className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-zinc-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
      />
      {q && (
        <button
          onClick={() => {
            setQ("");
            setOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500"
        >
          ✕
        </button>
      )}
      {open && sugs.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-md overflow-hidden">
          {sugs.map((s) => (
            <button
              key={s.id + "|" + s.label}
              onClick={() => {
                onPick(s.id);
                setOpen(false);
                setQ("");
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 flex items-center justify-between"
            >
              <span>
                {s.label} <span className="text-zinc-400">· {s.aux}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------- Timeline Helpers -------------------------------
function normalizeEventTitle(e: TraceEvent): string {
  const t = e.kind.replaceAll("_", " ");
  return t[0] + t.slice(1).toLowerCase();
}

function EventIcon({ kind }: { kind: TraceEvent["kind"] }) {
  const map: Record<TraceEvent["kind"], React.ElementType> = {
    ARRIVED: Archive,
    BOOKED: FileText,
    CHECK_PASS: CheckCircle2,
    CHECK_FAIL: XCircle,
    BATCH_START: FlaskConical,
    CONSUME: Recycle,
    OUTPUT: PackagePlus,
    BATCH_END: Flag,
    PACK_START: PackageIcon,
    PACK_END: PackageCheck,
    MOVE: Truck,
    RESERVE: Pin,
    ORDER_ALLOC: Paperclip,
    SHIPPED: Send,
    DELIVERED: Download,
    FARM_DATA: FileText,
    SUPPLIER_PO: FileText,
    SHIPMENT_PICKED: PackageIcon,
    BATCH_PLANNED: FileText,
    BATCH_RELEASED: FileText,
  };
  const Icon = map[kind] || 'div';
  return <Icon className="h-4 w-4" />;
}


function groupByPhase(events: TraceEvent[]) {
  const order: TraceEvent["phase"][] = ["SOURCE", "RECEIPT", "QC", "PRODUCTION", "PACK", "WAREHOUSE", "SALE", "DELIVERY"];
  const m = new Map<TraceEvent["phase"], TraceEvent[]>();
  for (const p of order) m.set(p, []);
  for (const e of events) m.get(e.phase)?.push(e);
  for (const p of order) m.set(p, (m.get(p) || []).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)));
  return { order, map: m };
}

// Given an open lot + genealogy, pick relevant events
function eventsForLot(traceEvents: TraceEvent[], lotId: string, relatedLotIds: string[]) {
  const set = new Set([lotId, ...relatedLotIds]);
  return traceEvents.filter((e) => {
    const L = e.links || ({} as any);
    return L.lotId && set.has(L.lotId);
  });
}

// ------------------------------- Página principal -------------------------------
export default function TraceabilityTimelinePage() {
  const { data: santaData } = useData();
  const [openLotId, setOpenLotId] = useState<string | null>(null);

  const { lots, sales, accounts, traceEvents, batches, qaChecks, users, links } = useMemo(
    () => ({
      lots: santaData?.lots || [],
      sales: santaData?.ordersSellOut || [],
      accounts: santaData?.accounts || [],
      traceEvents: (santaData?.traceEvents || []) as TraceEvent[],
      batches: santaData?.productionOrders || [],
      qaChecks: santaData?.qaChecks || [],
      users: santaData?.users || [],
      links: (santaData?.productionOrders || []).reduce((acc, b) => {
          (b.actuals || []).forEach((i: any) => {
            if (b.lotId && i.fromLot) {
                acc.push({ fromLotId: i.fromLot, toLotId: b.lotId });
            }
          });
          return acc;
      }, [] as GenealogyLink[]),
    }),
    [santaData]
  );
  
  const lotIndex = useMemo(() => buildIndex(lots), [lots]);
  const accountIndex = useMemo(() => buildIndex(accounts), [accounts]);
  const userIndex = useMemo(() => buildIndex(users), [users]);
  const prodOrderIndex = useMemo(() => buildIndex(batches), [batches]);

  const openLot = openLotId ? lotIndex.get(openLotId) || null : null;
  const parents = useMemo(() => (openLot ? backtrace(links, openLot.id).map((id) => lotIndex.get(id)!).filter(Boolean) : []), [links, openLot, lotIndex]);
  const children = useMemo(() => (openLot ? forwardtrace(links, openLot.id).map((id) => lotIndex.get(id)!).filter(Boolean) : []), [links, openLot, lotIndex]);
  const lotTests = useMemo(() => qaChecks.filter((t) => t.lotId === openLot?.id), [qaChecks, openLot?.id]);
  const lotSales = useMemo(() => sales.filter((s) => s.lines?.some((l) => l.lotIds?.includes(openLot?.id || ''))), [sales, openLot?.id]);


  const salesByCustomer = useMemo(() => {
    if (!openLot) return [];
    const map = new Map<string, { customerId: string; customerName: string; total: number; docs: SaleDoc[] }>();
    for (const s of lotSales) {
      const qty = (s.lines || []).filter((l) => l.lotIds?.includes(openLot.id)).reduce((a, b) => a + (b.qty || 0), 0);
      const key = s.accountId;
      const account = accountIndex.get(key);
      if (!account) continue;
      if (!map.has(key)) map.set(key, { customerId: s.accountId, customerName: account.name, total: 0, docs: [] });
      const rec = map.get(key)!;
      rec.total += qty;
      rec.docs.push(s);
    }
    return Array.from(map.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [lotSales, openLot, accountIndex]);

  const openLotProdOrder = openLot?.orderId ? prodOrderIndex.get(openLot.orderId) : null;

  const relatedLotIds = useMemo(() => {
    if (!openLot) return [] as string[];
    return [...parents.map((p) => p.id), ...children.map((c) => c.id)];
  }, [openLot, parents, children]);

  const lotEvents = useMemo(() => {
    if (!openLot) return [] as TraceEvent[];
    return eventsForLot(traceEvents, openLot.id, relatedLotIds);
  }, [traceEvents, openLot, relatedLotIds]);

  if (!santaData) return <div className="p-6">Cargando datos de trazabilidad…</div>;

  return (
    <div className="p-6 flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Trazabilidad · Timeline & Auditoría</h1>
          <p className="text-sm text-zinc-500">Solo lectura · Personas implicadas y datos históricos por lote</p>
        </div>
        <SearchBar lots={lots} onPick={setOpenLotId} />
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LISTA LOTES */}
        <div className="lg:col-span-1 rounded-2xl border border-zinc-200 overflow-hidden bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">Lote</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id} className="border-t border-zinc-200">
                  <td className="px-3 py-2 font-medium">{l.id}</td>
                  <td className="px-3 py-2">{l.sku}</td>
                  <td className="px-3 py-2">
                    <StatusPill s={l.quality?.qcStatus} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setOpenLotId(l.id)} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50">
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PANEL DERECHO */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-4 min-h-[320px]">
          {!openLot ? (
            <div className="text-zinc-500">Selecciona un lote para ver el timeline y la auditoría.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Header ficha */}
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">Lote {openLot.id}</div>
                <div className="flex items-center gap-2">
                  <StatusPill s={openLot.quality?.qcStatus} />
                </div>
              </div>

              {/* Ficha básica */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-sm text-zinc-500 mb-3">Ficha</div>
                  <div className="grid gap-2">
                    <Field label="ID Lote">{openLot.id}</Field>
                    <Field label="SKU">{openLot.sku}</Field>
                    <Field label="Cantidad">{openLot.quantity ?? "—"} uds</Field>
                    <Field label="Creado">{new Date(openLot.createdAt).toLocaleString()}</Field>
                    <Field label="Orden Prod.">{openLot.orderId || "—"}</Field>
                  </div>
                </div>

                {/* Genealogía */}
                <div className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-sm text-zinc-500 mb-3">Genealogía</div>
                  <div className="grid gap-1 text-sm">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Antecesores (backtrace)</div>
                      {parents.length ? (
                        parents.map((p) => (
                          <div key={p.id} className="flex items-center justify-between border border-zinc-200 rounded-lg px-2 py-1 mb-1">
                            <div>
                              <b>{p.id}</b> · <span className="text-zinc-600">{p.sku}</span>
                            </div>
                            <StatusPill s={p.quality?.qcStatus} />
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-400">No hay antecesores.</div>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-zinc-500 mb-1">Descendientes (forward)</div>
                      {children.length ? (
                        children.map((c) => (
                          <div key={c.id} className="flex items-center justify-between border border-zinc-200 rounded-lg px-2 py-1 mb-1">
                            <div>
                              <b>{c.id}</b> · <span className="text-zinc-600">{c.sku}</span>
                            </div>
                            <StatusPill s={c.quality?.qcStatus} />
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-400">No hay descendientes.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TIMELINE por fases */}
              <section className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-zinc-500">Timeline por fases</div>
                  <div className="text-xs text-zinc-500">{lotEvents.length} eventos</div>
                </div>
                <PhaseTimeline events={lotEvents} />
              </section>

              {/* Producción (protocolos/incidencias) */}
              {openLotProdOrder && <ProductionPanel prodOrder={openLotProdOrder} users={users} />}

              {/* QC */}
              <QCTable tests={lotTests} users={userIndex} />

              {/* Clientes/Ventas */}
              <SalesByCustomer lot={openLot} groups={salesByCustomer} accountIndex={accountIndex} santaData={santaData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------- Subcomponentes -------------------------------
function PhaseTimeline({ events }: { events: TraceEvent[] }) {
  const { order, map } = useMemo(() => groupByPhase(events), [events]);
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {order.map((phase) => (
        <div key={phase} className="border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-zinc-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhasePill phase={phase} />
              <span className="text-xs text-zinc-500">{map.get(phase)?.length || 0} evt</span>
            </div>
          </div>
          <ul className="divide-y divide-zinc-200">
            {(map.get(phase) || []).map((e) => (
              <li key={e.id} className="px-3 py-2 text-sm flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className="text-zinc-500 pt-0.5"><EventIcon kind={e.kind} /></div>
                  <div>
                    <div className="font-medium">{normalizeEventTitle(e)}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(e.occurredAt).toLocaleString()} {e.actorId ? `· ${e.actorId}` : ""}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <KindTag kind={e.kind} />
                      {e.links?.orderId && <Badge tone="blue">SO {e.links.orderId}</Badge>}
                      {e.links?.batchId && <Badge tone="blue">B {e.links.batchId}</Badge>}
                      {e.links?.shipmentId && <Badge tone="blue">SHP {e.links.shipmentId}</Badge>}
                      {e.links?.receiptId && <Badge tone="zinc">RCPT {e.links.receiptId}</Badge>}
                      {e.links?.qaCheckId && <Badge tone="amber">QC {e.links.qaCheckId}</Badge>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {(map.get(phase) || []).length === 0 && (
              <li className="px-3 py-6 text-sm text-zinc-400">Sin eventos en esta fase.</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ProductionPanel({ prodOrder, users }: { prodOrder: ProductionOrder; users: User[] }) {
  const userIndex = useMemo(() => buildIndex(users), [users]);
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="text-sm text-zinc-500 mb-2">Protocolos e Incidencias de Producción</div>
      <ul className="divide-y divide-zinc-200">
        {(prodOrder.checks || []).map((p: any) => (
          <li key={p.id} className="py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${p.done ? "bg-green-500" : "bg-zinc-300"}`} />
              <span>Protocolo: {p.text || p.id}</span>
            </div>
            <div className="text-xs text-zinc-500">
              {p.checkedBy ? <span className="mr-2">{userIndex.get(p.checkedBy)?.name || p.checkedBy}</span> : "—"}
              {p.checkedAt ? new Date(p.checkedAt).toLocaleString() : ""}
            </div>
          </li>
        ))}
        {(prodOrder.incidents || []).map((inc: any) => (
          <li key={inc.id} className="py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span>Incidencia: {inc.text}</span>
            </div>
            <div className="text-xs text-zinc-500">{new Date(inc.when).toLocaleString()}</div>
          </li>
        ))}
      </ul>
      {(prodOrder.checks?.length || 0) === 0 && (prodOrder.incidents?.length || 0) === 0 && (
        <div className="text-zinc-400 text-sm">No hay protocolos ni incidencias registradas.</div>
      )}
    </div>
  );
}

function QCTable({ tests, users }: { tests: QACheck[]; users: Map<string, User> }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="text-sm text-zinc-500 mb-2">Control de Calidad (QC)</div>
      {tests && tests.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Analista</th>
                <th className="px-3 py-2 text-left">Resultados</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-t border-zinc-200">
                  <td className="px-3 py-2">{new Date(t.reviewedAt || t.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{users.get(t.reviewedById || '')?.name || t.reviewedById || 'N/A'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(t.checklist || []).map((r, i) => (
                        <Badge key={i} tone={r.result === 'ok' ? "green" : "red"}>
                          {r.name}: {String(r.value)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-zinc-400 text-sm">Sin ensayos de calidad registrados para este lote.</div>
      )}
    </div>
  );
}

function SalesByCustomer({ lot, groups, accountIndex, santaData }: { lot: Lot; groups: { customerId: string; customerName: string; total: number; docs: SaleDoc[] }[]; accountIndex: Map<string, Account>, santaData: SantaData }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4">
      <div className="text-sm text-zinc-500 mb-2">Clientes a los que se ha vendido este lote</div>
      {groups.length ? (
        <div className="grid gap-3">
          {groups.map((g) => (
            <div key={g.customerId} className="border border-zinc-200 rounded-xl">
              <div className="px-3 py-2 flex items-center justify-between bg-zinc-50">
                <div className="font-medium">{g.customerName}</div>
                <div className="text-sm text-zinc-600">
                  Total: <b>{g.total}</b> ud
                </div>
              </div>
              <div className="divide-y divide-zinc-200">
                {g.docs.map((d) => {
                  const account = accountIndex.get(d.accountId);
                  const user = account ? santaData?.users.find(u => u.id === account.ownerId) : undefined;
                  return (
                    <div key={d.id} className="px-3 py-2 text-sm flex items-center justify-between">
                      <div>
                        <span className="font-mono">{d.id}</span> · {d.status} · {new Date(d.createdAt).toLocaleString()} ·
                        <span className="text-zinc-600"> {user?.name || "—"}</span>
                      </div>
                      <div>
                        {(d.lines || []).filter((l) => l.lotIds?.includes(lot.id)).reduce((a, b) => a + b.qty, 0)} {(d.lines || []).find((l) => l.lotIds?.includes(lot.id))?.uom || "uds"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-zinc-500 text-sm">Este lote no consta como vendido en ningún documento.</div>
      )}
    </div>
  );
}

    
