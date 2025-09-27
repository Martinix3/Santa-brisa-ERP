// ExecutionMock — Producción (estilo BOM) — MOCK VISUAL SOLO ESTRUCTURA
// - Sin SBPageShell, SBCard ni acciones reales
// - Acento Producción (var --sb-accent-produc)
// - Sidebar izquierda (planificar / órdenes) + Panel derecho (workstation)
// - Datos mock y componentes locales (Card, PageShell) para no depender de tu lib

"use client";

import React, { useMemo, useState } from "react";
import { Factory as FactoryIcon, Plus, Trash2, Pause, Play, Check, Search } from "lucide-react";

/* ============== Accent / helpers (mismo lenguaje visual que BOM) ============== */
const ACCENT_VAR = "--sb-accent-produc";               // 182 20% 47% en tus tokens
const accentText = `text-[hsl(var(${ACCENT_VAR}))]`;
const accentSoftBg = `bg-[hsl(var(${ACCENT_VAR})/0.10)]`;
const accentSoftRing = `ring-1 ring-[hsl(var(${ACCENT_VAR})/0.25)]`;

/* ========================= UI local mínima ========================= */
function Card({
  title,
  right,
  children,
  accentVar = ACCENT_VAR,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  accentVar?: string;
}) {
  return (
    <section className="rounded-2xl border bg-white shadow-[0_16px_24px_-8px_rgba(0,0,0,0.12)] overflow-hidden">
      {title && (
        <div className={`flex items-center justify-between px-4 py-3 border-b bg-zinc-50 ${accentSoftRing.replace(ACCENT_VAR, accentVar)}`}>
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-md grid place-items-center text-[hsl(var(${accentVar}))] bg-[hsl(var(${accentVar})/0.12)]`}>
              <FactoryIcon size={14} />
            </div>
            <div className="font-semibold text-zinc-900">{title}</div>
          </div>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

function Header({ accentVar = ACCENT_VAR }: { accentVar?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-screen-2xl px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl grid place-items-center ring-1 ring-black/5 text-[hsl(var(${accentVar}))] bg-[hsl(var(${accentVar})/0.12)]`}>
              <FactoryIcon size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 leading-tight">Producción</h1>
              <p className="text-xs text-zinc-600">Ejecución — mock visual con estilo BOM</p>
            </div>
          </div>
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${accentText.replace(ACCENT_VAR, accentVar)} bg-[hsl(var(${accentVar})/0.08)] hover:bg-[hsl(var(${accentVar})/0.12)]`}
            title="Nueva orden"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva orden</span>
          </button>
        </div>

        {/* subheader: búsqueda simple */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input className="w-full h-10 rounded-xl border bg-white/90 px-3 pl-9 text-sm shadow-inner" placeholder="Buscar BOM u orden…" />
          </div>
          <button className="px-3 py-1.5 rounded-lg border bg-white text-sm">Filtros</button>
        </div>
      </div>
    </header>
  );
}

/* ========================= Datos MOCK ========================= */
type MockBom = { id: string; name: string };
type MockOrder = { id: string; status: "PLANNED" | "IN_PROGRESS" | "PAUSED"; bomId: string };
type MockLine = { itemId: string; name: string; role: "FORMULA" | "PACKAGING"; qty: number; uom: string };

const MOCK_BOMS: MockBom[] = [
  { id: "BOM-PI-ROJO", name: "Vermut Rojo — PI (1 L)" },
  { id: "BOM-FG-ROJO-750", name: "Vermut Rojo — FG 750 ml" },
];

const MOCK_ORDERS: MockOrder[] = [
  { id: "ORD-00041", status: "IN_PROGRESS", bomId: "BOM-PI-ROJO" },
  { id: "ORD-00042", status: "PLANNED", bomId: "BOM-FG-ROJO-750" },
];

const MOCK_LINES_PI: MockLine[] = [
  { itemId: "raw_vino", name: "Vino base tinto", role: "FORMULA", qty: 0.85, uom: "L" },
  { itemId: "raw_azucar", name: "Azúcar", role: "FORMULA", qty: 0.09, uom: "kg" },
  { itemId: "int_bot", name: "Extracto botánicos", role: "FORMULA", qty: 0.06, uom: "L" },
];

const MOCK_LINES_FG: MockLine[] = [
  { itemId: "int_pi", name: "PI Vermut Rojo", role: "PACKAGING", qty: 0.75, uom: "L" },
  { itemId: "pkg_bot", name: "Botella 750 ml", role: "PACKAGING", qty: 1, uom: "unit" },
  { itemId: "pkg_tap", name: "Tapón corcho", role: "PACKAGING", qty: 1, uom: "unit" },
];

/* ========================= Subcomponentes mock ========================= */
function StatusBadge({ s }: { s: MockOrder["status"] }) {
  const map: Record<MockOrder["status"], string> = {
    PLANNED: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
    IN_PROGRESS: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    PAUSED: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${map[s]}`}>{s}</span>;
}

function LinesTable({ lines }: { lines: MockLine[] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="hidden md:grid grid-cols-[1.2fr,0.8fr,0.6fr,0.6fr,0.5fr] text-xs font-semibold text-zinc-600 px-3 py-2">
        <div>Material</div>
        <div>Rol</div>
        <div className="text-right">Cantidad</div>
        <div className="text-right">Real</div>
        <div>UoM</div>
      </div>
      {lines.map((l, i) => (
        <div key={`${l.itemId}-${i}`} className="grid grid-cols-1 md:grid-cols-[1.2fr,0.8fr,0.6fr,0.6fr,0.5fr] items-center px-3 py-2 border-t first:border-t-0 odd:bg-white even:bg-zinc-50/60">
          <div className="py-1">
            <div className="font-medium text-zinc-900">{l.name}</div>
            <div className="text-[11px] text-zinc-500">{l.itemId}</div>
          </div>
          <div className="text-sm text-zinc-700">{l.role}</div>
          <div className="text-right text-sm text-zinc-700 tabular-nums">{l.qty.toFixed(3)}</div>
          <div className="md:text-right text-zinc-400 text-sm">—</div>
          <div className="text-sm text-zinc-600">{l.uom}</div>
        </div>
      ))}
    </div>
  );
}

/* ========================= Página (MOCK) ========================= */
export default function ExecutionMock() {
  const [openBomId, setOpenBomId] = useState<string | null>(MOCK_BOMS[0].id);
  const [openOrderId, setOpenOrderId] = useState<string | null>(MOCK_ORDERS[0].id);

  const openOrder = useMemo(() => MOCK_ORDERS.find(o => o.id === openOrderId) || null, [openOrderId]);
  const openBom = useMemo(() => MOCK_BOMS.find(b => b.id === openBomId) || null, [openBomId]);

  const lines = useMemo(() => {
    if (openBom?.id === "BOM-PI-ROJO") return MOCK_LINES_PI;
    if (openBom?.id === "BOM-FG-ROJO-750") return MOCK_LINES_FG;
    if (openOrder?.bomId === "BOM-PI-ROJO") return MOCK_LINES_PI;
    if (openOrder?.bomId === "BOM-FG-ROJO-750") return MOCK_LINES_FG;
    return MOCK_LINES_PI;
  }, [openBom, openOrder]);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-24" style={{ [ACCENT_VAR]: "182 20% 47%" } as React.CSSProperties}>
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-6">
        {/* Sidebar izquierda */}
        <aside className="lg:col-span-3 space-y-4">
          <Card title="Planificar nueva orden">
            <div className="p-1 space-y-1">
              {MOCK_BOMS.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setOpenBomId(b.id); setOpenOrderId(null); }}
                  className={`w-full text-left p-2 rounded-md transition-colors text-sm font-medium ${openBomId === b.id ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Órdenes activas">
            <div className="p-1 space-y-1">
              {MOCK_ORDERS.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setOpenOrderId(o.id); setOpenBomId(null); }}
                  className={`w-full text-left p-2 rounded-md transition-colors text-sm ${openOrderId === o.id ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  <span className="font-mono">{o.id}</span> — <StatusBadge s={o.status} />
                </button>
              ))}
            </div>
          </Card>
        </aside>

        {/* Panel derecho */}
        <main className="lg:col-span-9 min-h-[70vh]">
          <Card
            title={
              <div className="flex items-center gap-2">
                <span>{openOrder ? `Orden: ${openOrder.id}` : (openBom?.name ?? "Puesto de trabajo")}</span>
              </div>
            }
            right={
              openOrder ? (
                <div className="flex items-center gap-2">
                  <button className={`h-9 px-3 rounded-lg border text-sm ${accentText} bg-[hsl(var(${ACCENT_VAR})/0.08)] hover:bg-[hsl(var(${ACCENT_VAR})/0.12)]`}><Pause size={16}/> Pausar</button>
                  <button className={`h-9 px-3 rounded-lg border text-sm ${accentText} bg-[hsl(var(${ACCENT_VAR})/0.08)] hover:bg-[hsl(var(${ACCENT_VAR})/0.12)]`}><Check size={16}/> Finalizar</button>
                </div>
              ) : (
                <button className={`h-9 px-3 rounded-lg border text-sm ${accentText} bg-[hsl(var(${ACCENT_VAR})/0.08)] hover:bg-[hsl(var(${ACCENT_VAR})/0.12)]`}><Play size={16}/> Planificar</button>
              )
            }
          >
            {/* Header acentuado como BOM */}
            <div className={`flex items-center justify-between px-4 py-3 ${accentSoftBg} ${accentSoftRing} rounded-xl mb-4`}>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg grid place-items-center ${accentText}`}>
                  <FactoryIcon size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900">{openBom?.name ?? "—"}</h2>
                    {openOrder && <StatusBadge s={openOrder.status} />}
                  </div>
                  <p className="text-xs text-zinc-600">{openBom?.id === "BOM-PI-ROJO" ? "Etapa: PRODUCCIÓN" : "Etapa: ENVASADO"}</p>
                </div>
              </div>
            </div>

            {/* Fila de planificación (mock) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Cantidad (base)</label>
                <input className="w-full h-10 px-3 rounded-lg border tabular-nums font-mono" defaultValue={openBom?.id === "BOM-FG-ROJO-750" ? 1 : 1} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Fecha prevista</label>
                <input type="date" className="w-full h-10 px-3 rounded-lg border" />
              </div>
              <div className="text-sm text-zinc-600 flex items-end">Etapa y cantidades solo ilustrativas.</div>
            </div>

            {/* Tabla de materiales (mock) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-800">Parte de Producción (Materiales)</h3>
                {openOrder && (
                  <button className={`h-9 px-3 rounded-lg border text-sm ${accentText} bg-[hsl(var(${ACCENT_VAR})/0.08)] hover:bg-[hsl(var(${ACCENT_VAR})/0.12)]`}>
                    Guardar consumo
                  </button>
                )}
              </div>
              <LinesTable lines={lines} />
            </div>

            {/* Bloques visuales de Calidad y Personal (mock) */}
            {openOrder && (
              <div className="space-y-6 pt-6 border-t">
                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${accentText}`}>Calidad y Personal</h3>
                  <label className="flex items-center gap-3 mb-4">
                    <input type="checkbox" defaultChecked />
                    He leído los protocolos.
                  </label>
                  <div className="flex items-end gap-2">
                    <input type="number" className="w-28 h-9 px-2 rounded-lg border tabular-nums font-mono" placeholder="Operarios" defaultValue={2} />
                    <button className={`h-9 px-3 rounded-lg border text-sm ${accentText} bg-[hsl(var(${ACCENT_VAR})/0.08)] hover:bg-[hsl(var(${ACCENT_VAR})/0.12)]`}>Guardar operarios</button>
                  </div>
                </div>

                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${accentText}`}>Incidencias</h3>
                  <div className="flex items-center gap-2">
                    <input className="w-full h-9 px-2 rounded-lg border" placeholder="Añadir incidencia…" />
                    <button className={`h-9 px-3 rounded-lg border text-sm ${accentText} bg-[hsl(var(${ACCENT_VAR})/0.08)] hover:bg-[hsl(var(${ACCENT_VAR})/0.12)]`}>Añadir</button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* FAB */}
      <button
        type="button"
        aria-label="Nueva orden"
        className={`fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl grid place-items-center border ${accentText} bg-[hsl(var(${ACCENT_VAR})/0.10)]`}
        title="Nueva orden"
      >
        <Plus />
      </button>
    </div>
  );
}

/* ========================= Tests básicos (no cambian comportamiento) ========================= */
export function __tests__() {
  return {
    hasTwoPanels: true,
    bomsCount: MOCK_BOMS.length,           // 2
    ordersCount: MOCK_ORDERS.length,       // 2
    hasBothStages: true,                   // PI vs FG representados
    tableLinesPI: MOCK_LINES_PI.length,    // 3
    tableLinesFG: MOCK_LINES_FG.length,    // 3
  };
}
