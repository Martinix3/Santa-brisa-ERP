/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/warehouse/inventory/InventoryClient.tsx
"use client";

import React, { useState, useTransition, useMemo } from "react";
import { SBButton } from "@/components/ui/ui-primitives";
import type { Item, OnHandView, StockMove } from "@/domain/ssot";
import { Plus, AlertCircle, RefreshCw, List, PackageSearch } from "lucide-react";
import { NewOnHandDialog } from "./components/NewOnHandDialog";
import { NewItemDrawer } from "./components/NewItemDrawer";
import { SupplierDrawer } from "./components/SupplierDrawer";
import { rebuildOnHand } from '@/server/actions/inventory.actions';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LotDetailPanel } from "./components/LotDetailPanel";
import { SkuAccordionRow } from "./components/SkuAccordionRow";
import { LotRows } from "./components/LotRows";
import { InventoryDashboard } from "@/features/warehouse/components/InventoryDashboard";
import { GoodsReceiptDrawer } from "@/features/warehouse/components/GoodsReceiptDrawer";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { BaseDrawer } from "@/components/drawers/BaseDrawer";
import { InventoryFiltersBar } from "@/features/warehouse/inventory/components/InventoryFiltersBar";
import { useInventoryFilters } from "@/features/warehouse/inventory/hooks/useInventoryFilters";
import { useInventoryData } from "@/features/warehouse/inventory/hooks/useInventoryData";
import type { RuleSeverity } from "@/domain/businessRules";
import { DEFAULT_WAREHOUSE_LOCATIONS } from "@/config/inventory";

type InventoryAlert = {
  alertKey: string;
  taskKey?: string;
  ruleId: string;
  severity: RuleSeverity;
  status: 'ACTIVE' | 'RESOLVED';
  sku: string;
  message: string;
  metrics: {
    status: string;
    totalPhysical: number;
    totalReleasedFree: number;
    totalOnHold: number;
    lotsCount: number;
  };
};

type InventoryClientProps = {
  onHand: OnHandView[];
  items: Item[];
  stockMoves: StockMove[];
  lots: any[]; // Datos completos de lotes para enriquecer la vista
  alerts: InventoryAlert[];
};

function Empty({ hint, icon: Icon }: { hint: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 border-2 border-dashed rounded-2xl bg-secondary/50 text-muted-foreground">
      {Icon && (
        <div className="p-3 rounded-full bg-secondary mb-4">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <p className="text-sm max-w-sm">{hint}</p>
    </div>
  );
}

export function InventoryClient({ onHand, items, stockMoves, lots, alerts }: InventoryClientProps) {
  const router = useRouter();
  
  // Estado local para UI
  const [viewMode, setViewMode] = useState<"sku" | "lot">("sku");
  const [selectedLotCode, setSelectedLotCode] = useState<string | null>(null);
  const [openNewReceipt, setOpenNewReceipt] = useState(false);
  const [openNewItem, setOpenNewItem] = useState(false);
  const [openNewSupplier, setOpenNewSupplier] = useState(false);
  const [openGoodsReceipt, setOpenGoodsReceipt] = useState(false);
  const [isRebuilding, startRebuildTransition] = useTransition();
  const [newlyCreatedItem, setNewlyCreatedItem] = useState<Item | null>(null);

  // Proveedores (TODO: obtener del servidor)
  const suppliers = useMemo(() => [] as string[], []);

  // Hooks personalizados para filtros y datos
  const {
    filters,
    setGlobalSearch,
    setLocationFilter,
    setQcFilter,
    setOnlyWithStock,
    resetFilters,
    filteredOnHand,
    totalRecords,
    filteredRecords,
    isSearching,
  } = useInventoryFilters({ onHand, items });

  const {
    summaries,
    skusWithLots: allSkusWithLots,
    lotRows: allLotRows,
    uomIncidentCount,
    locations,
    itemsById,      // SSOT V2: Use canonical itemId map
  } = useInventoryData({ onHand, items, stockMoves, lots });

  // Aplicar filtros a los datos transformados
  const { 
    skusWithLots, 
    lotRows 
  } = useInventoryData({ 
    onHand: filteredOnHand, 
    items, 
    stockMoves,
    lots
  });

  // Agregar ubicaciones por defecto
  const allLocations = useMemo(() => {
    const set = new Set(locations);
    DEFAULT_WAREHOUSE_LOCATIONS.forEach(loc => set.add(loc));
    return ['ALL', ...Array.from(set).filter(l => l !== 'ALL').sort()];
  }, [locations]);

  // Detalle del lote seleccionado
  const selectedLotDetails = useMemo(() => {
    if (!selectedLotCode) return null;
    const lot = lotRows.find(l => l.lotCode === selectedLotCode);
    const moves = stockMoves.filter(m => {
      // Buscar por lotCode (canónico SSOT v2)
      return m.lotCode === selectedLotCode;
    });
    // Buscar lot completo en la colección de lots para tener todos los metadatos
    const lotMaster = lots.find(l => l.lotCode === selectedLotCode);
    return lot ? { lot: { ...lot, ...lotMaster }, moves } : null;
  }, [selectedLotCode, lotRows, stockMoves, lots]);

  // Alertas activas
  const inventoryAlerts = useMemo(
    () => alerts.filter(alert => alert.status === 'ACTIVE'),
    [alerts]
  );

  // Handlers
  const handleRebuild = () => {
    startRebuildTransition(async () => {
      toast.info("Iniciando reconstrucción del inventario...");
      const result = await rebuildOnHand();
      if (result.ok) {
        const count = result.count ?? 0;
        toast.success(`Inventario reconstruido: ${count} registros actualizados.`);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Fallo al reconstruir inventario');
      }
    });
  };

  const handleViewChange = (v: string) => {
    if (v === 'sku' || v === 'lot') {
      setViewMode(v);
      setSelectedLotCode(null);
    }
  };

  const handleKpiClick = (qcStatus: string) => {
    setQcFilter(qcStatus);
    toast.info(`Filtro aplicado: ${qcStatus}`);
  };

  const handleAlertAction = (sku: string) => {
    setGlobalSearch(sku);
    toast.info(`Mostrando resultados para ${sku}`);
  };

  const severityStyles: Record<RuleSeverity, string> = {
    critical: 'border-red-200 bg-red-50 text-red-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  };

  return (
    <>
      <ModuleHeader title="Inventario & Almacén" icon={PackageSearch}>
        <>
          <SBButton
            variant="ghost"
            size="sm"
            onClick={handleRebuild}
            disabled={isRebuilding}
          >
            <RefreshCw size={16} className={isRebuilding ? 'animate-spin' : ''} />
            {isRebuilding ? 'Reconstruyendo…' : 'Recalcular stock'}
          </SBButton>
          <SBButton variant="secondary" size="sm" onClick={() => setOpenNewItem(true)}>
            <Plus size={16} /> Nuevo item
          </SBButton>
          <SBButton variant="primary" size="sm" onClick={() => setOpenNewReceipt(true)}>
            <Plus size={16} /> Nueva recepción
          </SBButton>
        </>
      </ModuleHeader>

      <main className="sb-page sb-page--with-header">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <InventoryDashboard
            summaries={Object.values(summaries)}
            uomIncidents={uomIncidentCount}
          />

          <section className={`grid gap-6 ${selectedLotDetails ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
            <div className="sb-glass rounded-2xl border border-border/40 shadow-lg/20">
              <div className="p-4 md:p-6 space-y-5">
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <PackageSearch size={18} className="text-muted-foreground" />
                    Inventario activo
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Filtra por SKU, lote o ubicación para encontrar existencias rápidamente.
                  </p>
                </div>

                <InventoryFiltersBar
                  filters={filters}
                  onGlobalSearchChange={setGlobalSearch}
                  onLocationChange={setLocationFilter}
                  onQcStatusChange={setQcFilter}
                  onOnlyWithStockChange={setOnlyWithStock}
                  onResetFilters={resetFilters}
                  locations={allLocations}
                  totalRecords={totalRecords}
                  filteredRecords={filteredRecords}
                  isSearching={isSearching}
                />

                {inventoryAlerts.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                      <AlertCircle size={16} />
                      {inventoryAlerts.length} alertas de inventario
                    </h4>
                    <div className="grid gap-2">
                      {inventoryAlerts.map(alert => (
                        <div
                          key={alert.alertKey}
                          className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${severityStyles[alert.severity]}`}
                        >
                          <AlertCircle size={14} className="shrink-0 mt-[2px]" />
                          <span>
                            <strong>{alert.sku}</strong> · {alert.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Tabs value={viewMode} onValueChange={handleViewChange} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 rounded-lg bg-background/60 p-1">
                    <TabsTrigger
                      value="sku"
                      className="text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
                    >
                      Por SKU
                    </TabsTrigger>
                    <TabsTrigger
                      value="lot"
                      className="text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
                    >
                      Por lote
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sku">
                    <div className="sb-table-wrapper">
                      <table className="sb-table">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th className="text-right">Stock total</th>
                            <th className="text-right">Disponible</th>
                            <th className="text-right">Reservado</th>
                            <th className="text-right">En QC</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                      </table>
                      {skusWithLots.length > 0 ? (
                        <div className="divide-y">
                          {skusWithLots.map(({ summary, lots: skuLots }) => (
                            <SkuAccordionRow
                              key={summary.sku}
                              summary={summary}
                              item={summary.itemId ? itemsById.get(summary.itemId) : undefined}
                              lots={skuLots}
                              onLotSelect={setSelectedLotCode}
                              stockMoves={stockMoves}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="p-8">
                          <Empty hint="No hay stock que coincida con los filtros." icon={List} />
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="lot">
                    <LotRows lots={lotRows} onLotSelect={setSelectedLotCode} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {selectedLotDetails && (
              <aside className="sb-glass rounded-2xl border border-border/40 shadow-lg/20 h-fit">
                <LotDetailPanel 
                  lotDetails={selectedLotDetails} 
                  items={items} 
                  onClose={() => setSelectedLotCode(null)} 
                />
              </aside>
            )}
          </section>
        </div>
      </main>

      <NewOnHandDialog
        open={openNewReceipt}
        onClose={() => setOpenNewReceipt(false)}
        onSuccess={(result) => {
          toast.success(`Entrada registrada. Lote: ${result.lotNumber}`);
          setOpenNewReceipt(false);
          router.refresh();
        }}
        items={items}
        locations={allLocations.filter(l => l !== 'ALL')}
        suppliers={suppliers}
      />

      <NewItemDrawer
        open={openNewItem}
        onClose={() => setOpenNewItem(false)}
        onSuccess={(item) => {
          setOpenNewItem(false);
          toast.success(`Producto "${item.name}" creado correctamente`);
          router.refresh();
        }}
      />

      <SupplierDrawer
        open={openNewSupplier}
        onClose={() => setOpenNewSupplier(false)}
        onSuccess={(supplier) => {
          setOpenNewSupplier(false);
          toast.success(`Proveedor "${supplier.name}" añadido`);
          router.refresh();
        }}
      />

    </>
  );
}
