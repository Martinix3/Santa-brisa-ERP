/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/quality/traceability/QualityTraceabilityClient.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ElementType, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle,
  CheckCircle2,
  Factory,
  FileText,
  GitBranch,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { GeminiAlertsCard } from "@/components/quality/GeminiAlertsCard";
import { Avatar } from "@/components/ui/Avatar";
import type {
  Item,
  Lot,
  TraceData,
  TraceEvent,
  ProductionSummary,
  QualitySummary,
} from "@/domain/ssot";
import type { QualityTraceabilitySnapshot } from "@/server/actions/quality.data";
import { getLotTraceability } from "./actions";

type Props = QualityTraceabilitySnapshot;

const EVENT_CONFIG: Record<
  string,
  { icon: ElementType; color: string; tone: string; label: string }
> = {
  RECEIPT: {
    icon: Truck,
    color: "bg-info/10 text-info",
    tone: "border-info/20",
    label: "Recepción",
  },
  ARRIVED: {
    icon: Truck,
    color: "bg-info/10 text-info",
    tone: "border-info/20",
    label: "Llegada",
  },
  PRODUCTION_IN: {
    icon: Factory,
    color: "bg-success/10 text-success",
    tone: "border-success/20",
    label: "Entrada producción",
  },
  PRODUCTION_OUT: {
    icon: Factory,
    color: "bg-warning/10 text-warning",
    tone: "border-warning/20",
    label: "Salida producción",
  },
  SHIP: {
    icon: Truck,
    color: "bg-destructive/10 text-destructive",
    tone: "border-destructive/20",
    label: "Envío",
  },
  SALE: {
    icon: Truck,
    color: "bg-destructive/10 text-destructive",
    tone: "border-destructive/20",
    label: "Venta",
  },
  ADJUSTMENT: {
    icon: AlertTriangle,
    color: "bg-warning/10 text-warning",
    tone: "border-warning/20",
    label: "Ajuste",
  },
  TRANSFER: {
    icon: ArrowLeftRight,
    color: "bg-muted text-muted-foreground",
    tone: "border-border/40",
    label: "Transferencia",
  },
  QC_TEST: {
    icon: ShieldCheck,
    color: "bg-primary/10 text-primary",
    tone: "border-primary/30",
    label: "Test QC",
  },
  QC_DECISION: {
    icon: ShieldCheck,
    color: "bg-primary/10 text-primary",
    tone: "border-primary/30",
    label: "Decisión QC",
  },
  APPROVED: {
    icon: CheckCircle,
    color: "bg-success/10 text-success",
    tone: "border-success/30",
    label: "Aprobado",
  },
  REJECTED: {
    icon: AlertTriangle,
    color: "bg-destructive/10 text-destructive",
    tone: "border-destructive/30",
    label: "Rechazado",
  },
  GENEALOGY_PARENT: {
    icon: GitBranch,
    color: "bg-secondary text-muted-foreground",
    tone: "border-border/40",
    label: "Origen",
  },
  GENEALOGY_CHILD: {
    icon: GitBranch,
    color: "bg-secondary text-muted-foreground",
    tone: "border-border/40",
    label: "Destino",
  },
};

const parseISODate = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatDate = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
  const date = parseISODate(value);
  return date ? date.toLocaleDateString("es-ES", options) : "—";
};

const formatDateTime = (value?: string | null) => {
  const date = parseISODate(value);
  return date
    ? date.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
    : "Fecha desconocida";
};

const lotTimestamp = (lot: Lot) =>
  parseISODate(lot.updatedAt ?? lot.receivedAt ?? lot.createdAt)?.getTime() ?? 0;

export function QualityTraceabilityClient({
  events,
  lots,
  items,
  accounts,
  predictiveAlerts,
}: Props) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>("");
  const [lotSearch, setLotSearch] = useState("");
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [isTracing, startTraceTransition] = useTransition();

  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach(item => {
      if (item.id) map.set(item.id, item);
      // Also index by SKU for legacy lookups
      if (item.sku) map.set(item.sku, item);
    });
    return map;
  }, [items]);

  const accountsById = useMemo(() => {
    const map = new Map<string, (typeof accounts)[number]>();
    accounts.forEach(account => map.set(account.id, account));
    return map;
  }, [accounts]);

  useEffect(() => {
    if (!selectedItemId && items.length > 0) {
      const first = items[0];
      setSelectedItemId(first.id ?? first.sku ?? "");
    }
  }, [items, selectedItemId]);

  const lotsForItem = useMemo(() => {
    if (!selectedItemId) return [];
    const selectedItem = itemsById.get(selectedItemId);
    const sku = selectedItem?.sku ?? selectedItem?.id ?? selectedItemId;
    return lots
      .filter(lot => lot.sku === sku || lot.itemId === selectedItemId)
      .sort((a, b) => lotTimestamp(b) - lotTimestamp(a));
  }, [selectedItemId, lots, itemsById]);

  const filteredLots = useMemo(() => {
    if (!lotSearch.trim()) return lotsForItem;
    const query = lotSearch.toLowerCase();
    return lotsForItem.filter(lot => {
      const item = itemsById.get(lot.itemId ?? lot.sku ?? "");
      const lotCodeOrNumber = (lot as any).lotCode ?? lot.lotNumber;
      return (
        lotCodeOrNumber?.toLowerCase().includes(query) ||
        (lot.itemName ?? item?.name ?? "").toLowerCase().includes(query)
      );
    });
  }, [lotsForItem, lotSearch, itemsById]);

  useEffect(() => {
    if (lotsForItem.length > 0 && !selectedLotNumber) {
      const firstLot = lotsForItem[0];
      setSelectedLotNumber((firstLot as any).lotCode ?? firstLot.lotNumber ?? "");
    }
    if (lotsForItem.length === 0) {
      setSelectedLotNumber("");
      setTraceData(null);
    }
  }, [lotsForItem, selectedLotNumber]);

  useEffect(() => {
    if (!selectedLotNumber) return;
    startTraceTransition(async () => {
      const result = await getLotTraceability(selectedLotNumber);
      if (!result.ok || !result.data) {
        const message =
          "message" in result && typeof result.message === "string"
            ? result.message
            : `No se pudieron obtener eventos para ${selectedLotNumber}`;
        toast.error(message);
        setTraceData(null);
        return;
      }
      setTraceData(result.data);
    });
  }, [selectedLotNumber]);

  const handleRefresh = () => {
    startTransition(async () => {
      router.refresh();
      toast.success("Trazabilidad actualizada");
    });
  };

  const recentEvents = useMemo(() => events.slice(0, 8), [events]);

  return (
    <>
      <ModuleHeader title="Trazabilidad de Lotes" icon={Search}>
        <div className="flex gap-2">
          <SBButton variant="secondary" size="sm" disabled={isRefreshing} onClick={handleRefresh}>
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Actualizar
          </SBButton>
        </div>
      </ModuleHeader>

      <main className="sb-page sb-page--with-header">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-6">
          <aside className="space-y-4">
            <section className="sb-glass rounded-2xl border border-border/40 p-4 space-y-4">
              <header className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Producto</p>
                  <p className="text-sm font-semibold text-foreground">Selecciona un SKU</p>
                </div>
              </header>

              <Select
                value={selectedItemId}
                onChange={event => {
                  setSelectedItemId(event.target.value);
                  setLotSearch("");
                }}
              >
                {items.map(item => (
                  <option key={item.id ?? item.sku} value={item.id ?? item.sku}>
                    {item.name ?? item.sku ?? item.id}
                  </option>
                ))}
              </Select>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Lotes disponibles
                </label>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={lotSearch}
                    onChange={event => setLotSearch(event.target.value)}
                    placeholder="Buscar lote..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                  {filteredLots.map(lot => {
                    const lotCodeOrNumber = (lot as any).lotCode ?? lot.lotNumber;
                    return (
                    <button
                      key={lotCodeOrNumber}
                      onClick={() => setSelectedLotNumber(lotCodeOrNumber ?? "")}
                      className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                        selectedLotNumber === lotCodeOrNumber
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/40 hover:border-primary/30"
                      }`}
                    >
                      <p className="font-semibold text-xs">{lotCodeOrNumber}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(lot.createdAt ?? lot.receivedAt)}
                      </p>
                    </button>
                    );
                  })}
                  {filteredLots.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-6">
                      No hay lotes con este filtro.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <GeminiAlertsCard alerts={predictiveAlerts} />

            <section className="sb-glass rounded-2xl border border-border/40 p-4 space-y-3">
              <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Zap size={16} />
                Eventos recientes QC
              </header>
              <div className="space-y-2">
                {recentEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No hay eventos registrados en la fase de calidad.
                  </p>
                ) : (
                  recentEvents.map(event => {
                    const config = EVENT_CONFIG[event.kind?.toUpperCase() ?? "QC_TEST"] ?? EVENT_CONFIG.QC_TEST;
                    return (
                      <div
                        key={event.id}
                        className={`p-3 rounded-xl border ${config.tone} bg-background/60`}
                      >
                        <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <config.icon size={14} />
                          {config.label}
                        </p>
                        <p className="text-sm font-semibold text-foreground line-clamp-2 mt-1">
                          {event.title ?? "Evento sin título"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatDateTime(event.at)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </aside>

          <section className="sb-glass rounded-3xl border border-border/40 p-6 space-y-6 min-h-[560px]">
            {isTracing ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-20">
                <Search size={36} className="mb-4 animate-pulse" />
                <p className="text-sm font-semibold">Generando informe de trazabilidad...</p>
              </div>
            ) : traceData?.lot ? (
              <TraceReport
                traceData={traceData}
                itemsById={itemsById}
                accountsById={accountsById}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-20">
                <Package size={36} className="mb-3" />
                <p className="text-sm font-semibold">Selecciona un lote</p>
                <p className="text-xs">Elige un SKU y lote para ver su dossier completo.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function TraceReport({
  traceData,
  itemsById,
  accountsById,
}: {
  traceData: TraceData;
  itemsById: Map<string, Item>;
  accountsById: Map<string, { id: string; name: string }>;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-foreground">
          Informe de trazabilidad · {(traceData.lot as any)?.lotCode ?? traceData.lot?.lotNumber}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {traceData.lot?.itemName ??
            itemsById.get(traceData.lot?.itemId ?? traceData.lot?.sku ?? "")?.name ??
            traceData.lot?.sku}
        </p>
      </header>

      <LotSummaryCard
        traceData={traceData}
        itemsById={itemsById}
        accountsById={accountsById}
      />
      {traceData.qualitySummary && <QualitySummaryCard summary={traceData.qualitySummary} />}
      {traceData.productionSummary && (
        <ProductionSummaryCard productionSummary={traceData.productionSummary} />
      )}
      <GenealogyCard traceData={traceData} itemsById={itemsById} />
      <ConsumptionInProductionCard traceData={traceData} />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Historial cronológico</h3>
        {traceData.events && traceData.events.length > 0 ? (
          <div className="border border-border/40 rounded-2xl divide-y divide-border/40 overflow-hidden">
            {traceData.events
              .filter(
                event =>
                  event.kind !== "GENEALOGY_PARENT" && event.kind !== "GENEALOGY_CHILD" && event.kind
              )
              .map(event => (
                <TraceEventCard key={event.id ?? `${event.kind}-${event.at}`} event={event} />
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-10">
            No se encontraron eventos para este lote.
          </p>
        )}
      </section>
    </div>
  );
}

function LotSummaryCard({
  traceData,
  itemsById,
  accountsById,
}: {
  traceData: TraceData;
  itemsById: Map<string, Item>;
  accountsById: Map<string, { id: string; name: string }>;
}) {
  const lot = traceData.lot;
  if (!lot) return null;

  const item = itemsById.get(lot.itemId ?? lot.sku ?? "");
  const supplierName = lot.supplierId
    ? accountsById.get(lot.supplierId)?.name ?? lot.supplierId
    : traceData.receiptInfo?.supplierPartyId
    ? accountsById.get(traceData.receiptInfo.supplierPartyId)?.name ??
      traceData.receiptInfo.supplierPartyId
    : undefined;

  const onHandLocations = (traceData.onHandSummary ?? [])
    .filter(summary => summary.qty > 0)
    .map(summary => `${summary.locationId || summary.warehouseId} (${summary.qty})`)
    .join(", ");
  const documents = Array.isArray(lot.qcDocuments) ? lot.qcDocuments : [];
  const conditions = Array.isArray(lot.qcConditions) ? lot.qcConditions : [];
  const primaryDocument = lot.qcCoaUrl ?? lot.qcCoa;

  return (
    <section className="sb-glass rounded-2xl border border-border/40 p-4 space-y-4">
      <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Package size={16} />
        Dossier del lote
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <SummaryTile label="Estado QC" value={lot.qcStatus ?? "Desconocido"} />
        <SummaryTile label="SKU" value={lot.sku ?? lot.itemId ?? "—"} />
        <SummaryTile label="Nombre" value={item?.name ?? lot.itemName ?? "Sin nombre"} />
        <SummaryTile label="Stock" value={onHandLocations || "Sin stock"} />
        {supplierName && <SummaryTile label="Proveedor" value={supplierName} />}
        {traceData.receiptInfo?.deliveryNote && (
          <SummaryTile label="Albarán" value={traceData.receiptInfo.deliveryNote} />
        )}
        {lot.qcReviewOwnerName && (
          <SummaryTile label="Revisor QC" value={lot.qcReviewOwnerName} />
        )}
        {lot.qcApprovedByName && (
          <SummaryTile label="Aprobado por" value={lot.qcApprovedByName} />
        )}
        {lot.qcRejectedByName && (
          <SummaryTile label="Rechazado por" value={lot.qcRejectedByName} />
        )}
        {traceData.productionSummary?.orderId && (
          <SummaryTile
            label="Orden de producción"
            value={
              <Link
                href={`/production/execution?orderId=${traceData.productionSummary.orderId}`}
                className="text-primary hover:underline"
              >
                {traceData.productionSummary.orderName ?? traceData.productionSummary.orderId}
              </Link>
            }
          />
        )}
        {traceData.saleInfo?.customerName && (
          <SummaryTile label="Cliente" value={traceData.saleInfo.customerName} />
        )}
      </div>

      {(traceData.receiptInfo ||
        conditions.length > 0 ||
        lot.qcApprovalNotes ||
        documents.length > 0 ||
        primaryDocument) && (
        <div className="space-y-4">
          {traceData.receiptInfo && (
            <div className="rounded-xl border border-border/40 bg-background/60 p-4 text-xs text-muted-foreground space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/90 font-semibold">
                Detalles de recepción
              </p>
              {traceData.receiptInfo.receivedBy && (
                <div className="flex justify-between gap-2">
                  <span>Recibido por</span>
                  <span className="font-medium text-foreground">
                    {traceData.receiptInfo.receivedBy}
                  </span>
                </div>
              )}
              {traceData.receiptInfo.deliveryNote && (
                <div className="flex justify-between gap-2">
                  <span>Albarán</span>
                  <span className="font-medium text-foreground">
                    {traceData.receiptInfo.deliveryNote}
                  </span>
                </div>
              )}
            </div>
          )}

          {(conditions.length > 0 || lot.qcApprovalNotes || lot.qcRejectionReason) && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-warning font-semibold">
                Condiciones y notas de QC
              </p>
              {lot.qcApprovalNotes && (
                <p className="text-warning-foreground">{lot.qcApprovalNotes}</p>
              )}
              {lot.qcRejectionReason && (
                <p className="text-warning-foreground">
                  Motivo de rechazo: {lot.qcRejectionReason}
                </p>
              )}
              {conditions.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-warning-foreground">
                  {conditions.map(condition => (
                    <li key={condition}>{condition}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(primaryDocument || documents.length > 0) && (
            <div className="rounded-xl border border-border/40 bg-background/60 p-4 text-xs space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                Documentos asociados
              </p>
              <div className="space-y-2">
                {primaryDocument && (
                  <Link
                    href={primaryDocument}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Certificado de Análisis
                  </Link>
                )}
                {documents.map(doc => (
                  <div key={doc.url ?? doc.name} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground truncate">{doc.name ?? doc.url}</span>
                    {doc.url && (
                      <Link
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Ver
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-background/60">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-1">{value}</p>
    </div>
  );
}

function QualitySummaryCard({ summary }: { summary: QualitySummary }) {
  const decision = summary.finalDecision?.toUpperCase();
  const isApproved = decision === "PASSED" || decision === "APPROVED";
  const isPending = decision === "PENDING" || decision === "IN_PROGRESS";
  const tone = isApproved
    ? "bg-success/10 text-success border-success/30"
    : isPending
    ? "bg-warning/10 text-warning border-warning/30"
    : "bg-destructive/10 text-destructive border-destructive/30";
  const Icon = isApproved ? CheckCircle : isPending ? AlertTriangle : AlertTriangle;
  return (
    <section className="sb-glass rounded-2xl border border-border/40 p-4 space-y-3">
      <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck size={16} />
        Resumen de Calidad
      </header>
      <div className={`p-3 rounded-xl border ${tone} flex items-center gap-2`}>
        <Icon size={18} />
        <div>
        <p className="text-sm font-semibold">
          Decisión final: {summary.finalDecision ?? "Sin registrar"}
        </p>
        {summary.decisionBy && (
          <p className="text-xs text-muted-foreground">
            por {summary.decisionBy} ·{" "}
            {summary.decisionAt ? formatDateTime(summary.decisionAt) : "fecha desconocida"}
          </p>
        )}
      </div>
      </div>

      {summary.tests?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Análisis</p>
          <div className="grid gap-2">
            {summary.tests.map((test: any, index: number) => {
              const inSpec = test.inSpec === true || test.result === "PASS";
              return (
                <div
                  key={`${test.parameterId}-${index}`}
                  className={`p-2 rounded-lg border text-xs flex justify-between items-center ${
                    inSpec ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  <span className="font-semibold">{test.parameterId ?? test.kind ?? "Parámetro"}</span>
                  <span className="font-mono">{test.value ?? test.result}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {summary.observations && (
        <div className="p-3 rounded-xl border border-warning/30 bg-warning/5 text-xs text-warning-foreground">
          <p className="font-semibold flex items-center gap-2">
            <FileText size={14} />
            Observaciones
          </p>
          <p className="mt-2 text-warning">{summary.observations}</p>
        </div>
      )}
    </section>
  );
}

function GenealogyCard({
  traceData,
  itemsById,
}: {
  traceData: TraceData;
  itemsById: Map<string, Item>;
}) {
  const parents = traceData.events.filter(event => event.kind === "GENEALOGY_PARENT");
  const children = traceData.events.filter(event => event.kind === "GENEALOGY_CHILD");
  if (parents.length === 0 && children.length === 0) return null;

  const resolveLotName = (lotCode: string | undefined) => {
    if (!lotCode) return "Lote desconocido";
    // Try to find item by lotCode (fallback to itemId lookup if needed)
    return lotCode;
  };

  return (
    <section className="sb-glass rounded-2xl border border-border/40 p-4 space-y-4">
      <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <GitBranch size={16} />
        Genealogía
      </header>

      {parents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <ArrowLeftRight size={12} />
            Materias primas utilizadas
          </p>
          {parents.map(parent => {
            const lotNumber = parent.title?.split(":").pop()?.trim();
            return (
              <div key={parent.id} className="p-3 rounded-xl border border-border/40 bg-background/70">
                <p className="text-sm font-semibold text-foreground">
                  {resolveLotName(lotNumber)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {parent.details ?? parent.title ?? "Sin detalles"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {children.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <ArrowLeftRight size={12} />
            Usado en
          </p>
          {children.map(child => {
            const lotNumber = child.title?.split(":").pop()?.trim();
            return (
              <div key={child.id} className="p-3 rounded-xl border border-border/40 bg-background/70">
                <p className="text-sm font-semibold text-foreground">
                  {resolveLotName(lotNumber)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {child.details ?? child.title ?? "Sin detalles"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProductionSummaryCard({ productionSummary }: { productionSummary: ProductionSummary }) {
  return (
    <section className="sb-glass rounded-2xl border border-border/40 p-4 space-y-4">
      <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Factory size={16} />
        Producción
      </header>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={`/production/execution?orderId=${productionSummary.orderId}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {productionSummary.orderName ?? productionSummary.orderId}
            </Link>
            {productionSummary.responsible && (
              <p className="text-xs text-muted-foreground mt-1">
                Responsable: {productionSummary.responsible}
              </p>
            )}
          </div>
          <div className="p-2 rounded-lg border border-success/30 bg-success/10 text-xs text-success font-semibold">
            Desviación:{" "}
            {productionSummary.deviation >= 0 ? "+" : ""}
            {productionSummary.deviation.toFixed(2)} (
            {productionSummary.deviationPct.toFixed(1)}%)
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <SummaryTile label="Planificado" value={`${productionSummary.targetQty} uds`} />
          <SummaryTile label="Real" value={`${productionSummary.actualQty} uds`} />
          <SummaryTile
            label="Incidentes"
            value={productionSummary.incidentCount > 0 ? productionSummary.incidentCount : "0"}
          />
        </div>

        {productionSummary.materialsConsumed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Materiales consumidos
            </p>
            <div className="space-y-1">
              {productionSummary.materialsConsumed.map((material, index) => {
              const materialLot = (material as any).lotCode ?? material.lotNumber;
              return (
                <div
                  key={`${materialLot}-${index}`}
                  className="flex items-center justify-between text-xs rounded-lg border border-border/40 bg-background/60 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-foreground">{material.itemName}</p>
                    <p className="text-[11px] text-muted-foreground">Lote {materialLot}</p>
                  </div>
                  <p className="font-semibold text-foreground">
                    {material.qtyUsed} {material.uom}
                  </p>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ConsumptionInProductionCard({ traceData }: { traceData: TraceData }) {
  const consumptionEvents = traceData.events.filter(
    event => event.kind === "PRODUCTION_OUT" && event.data?.orderId
  );
  if (consumptionEvents.length === 0) return null;

  const eventsByOrder = consumptionEvents.reduce<Record<string, TraceEvent[]>>((acc, event) => {
    const orderId = event.data?.orderId;
    if (!orderId) return acc;
    acc[orderId] = acc[orderId] ?? [];
    acc[orderId].push(event);
    return acc;
  }, {});

  return (
    <section className="sb-glass rounded-2xl border border-border/40 p-4 space-y-4">
      <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Factory size={16} />
        Uso en otras órdenes
      </header>
      <div className="space-y-3">
        {Object.entries(eventsByOrder).map(([orderId, orderEvents]) => (
          <div key={orderId} className="p-3 rounded-xl border border-border/40 bg-background/70">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/production/execution?orderId=${orderId}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {orderEvents[0].data?.orderName ?? orderId}
                </Link>
                {orderEvents[0].data?.responsible && (
                  <p className="text-xs text-muted-foreground">
                    Responsable: {orderEvents[0].data?.responsible}
                  </p>
                )}
              </div>
            <p className="text-[11px] text-muted-foreground">
              {orderEvents[0].at ? formatDate(orderEvents[0].at) : "—"}
            </p>
            </div>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {orderEvents.map(event => (
                <div key={event.id}>• {event.title}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TraceEventCard({ event }: { event: TraceEvent }) {
  const config = EVENT_CONFIG[event.kind?.toUpperCase() ?? "QC_TEST"] ?? EVENT_CONFIG.QC_TEST;
  const Icon = config.icon;
  return (
    <article className="flex gap-4 p-4 bg-background/60">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${config.color}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{event.title ?? "Evento"}</p>
          <span className="text-[11px] text-muted-foreground">{formatDateTime(event.at)}</span>
        </div>
        {event.details && <p className="text-xs text-muted-foreground">{event.details}</p>}
        {event.data?.fromLocation && (
          <p className="text-xs text-muted-foreground">
            Origen: <span className="font-medium text-foreground">{event.data.fromLocation}</span>
          </p>
        )}
        {event.data?.toLocation && (
          <p className="text-xs text-muted-foreground">
            Destino: <span className="font-medium text-foreground">{event.data.toLocation}</span>
          </p>
        )}
        {event.data?.documentUrl && (
          <p className="text-xs">
            <Link href={event.data.documentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Ver documento
            </Link>
          </p>
        )}
        {event.data?.notes && (
          <p className="text-xs text-muted-foreground whitespace-pre-line">
            {event.data.notes}
          </p>
        )}
        {event.kind === "PRODUCTION_OUT" && event.data && event.data.responsible && (
          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/70 px-3 py-2">
            <Avatar name={event.data.responsible} size="sm" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Responsable</p>
              <p className="text-muted-foreground">{event.data.responsible}</p>
            </div>
          </div>
        )}
        {event.kind === "QC_TEST" && event.data && (
          <QcTestEventDetails data={event.data} />
        )}
        {event.data && (event.data.decision || event.data.results || event.data.reviewer) && (
          <QcDecisionEventDetails event={event} data={event.data} />
        )}
      </div>
    </article>
  );
}

function QcTestEventDetails({ data }: { data: Record<string, any> }) {
  const inSpec = data.inSpec === true || data.result === "PASS";
  return (
    <div
      className={`mt-2 text-xs flex items-center gap-2 p-2 rounded-lg border ${
        inSpec ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {inSpec ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      <span className="font-semibold">{data.parameterId ?? data.kind}</span>
      <span>{data.value ?? data.result}</span>
      {data.takenBy && <span className="ml-auto text-muted-foreground">por {data.takenBy}</span>}
    </div>
  );
}

function QcDecisionEventDetails({
  event,
  data,
}: {
  event: TraceEvent;
  data: Record<string, any>;
}) {
  const decision = data.decision ?? event.title ?? "Decision";
  const isApproved =
    decision.toUpperCase().includes("APPROVED") || decision.toUpperCase().includes("PASSED");
  const Icon = isApproved ? CheckCircle : AlertTriangle;
  return (
    <div className="mt-3 border border-border/40 rounded-xl bg-background/60 text-xs space-y-2 p-3">
      <div className={`flex items-center gap-2 ${isApproved ? "text-success" : "text-destructive"}`}>
        <Icon size={14} />
        <span className="font-semibold">{decision}</span>
      </div>
      {data.results && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.results).map(([key, value]) => (
            <div key={key} className="p-2 rounded-lg border border-border/40 bg-background/80">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{key}</p>
              <p className="font-semibold text-foreground">{String(value)}</p>
            </div>
          ))}
        </div>
      )}
      {data.observations && (
        <div className="p-2 rounded-lg border border-warning/30 bg-warning/10 text-warning">
          <p className="font-semibold flex items-center gap-2">
            <FileText size={12} />
            Observaciones
          </p>
          <p className="mt-1">{data.observations}</p>
        </div>
      )}
      {data.reviewer && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserIcon size={14} />
          <span>Revisado por {data.reviewer}</span>
        </div>
      )}
    </div>
  );
}
