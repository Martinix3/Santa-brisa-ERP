"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { Thermometer, Droplets, Factory, Bug, CheckCircle2, XCircle, Calendar, CalendarDays, Clock } from "lucide-react";
import type { Lot, ProductionProtocol, ProductionProtocolRun, Document } from "@/domain/ssot-v2-plus-schemas";
import { AppccControlDrawer } from "./components/AppccControlDrawer";

interface AppccDashboardClientProps {
  lots: Lot[];
  protocols: ProductionProtocol[];
  protocolRuns: ProductionProtocolRun[];
  documents: Document[];
}

type TabType = "active" | "completed" | "pending";

export function AppccDashboardClient({ lots, protocols, protocolRuns, documents }: AppccDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [selectedProtocol, setSelectedProtocol] = useState<ProductionProtocol | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Parse dates from serialized data
  const parsedProtocols = protocols.map(p => ({
    ...p,
    createdAt: typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt,
    updatedAt: typeof p.updatedAt === 'string' ? new Date(p.updatedAt) : p.updatedAt,
  }));

  const parsedRuns = protocolRuns.map(r => ({
    ...r,
    startedAt: typeof r.startedAt === 'string' ? new Date(r.startedAt) : r.startedAt,
    completedAt: r.completedAt && typeof r.completedAt === 'string' ? new Date(r.completedAt) : r.completedAt,
    createdAt: typeof r.createdAt === 'string' ? new Date(r.createdAt) : r.createdAt,
    updatedAt: typeof r.updatedAt === 'string' ? new Date(r.updatedAt) : r.updatedAt,
  }));

  // Filtrar protocolos según tab
  const filteredProtocols = parsedProtocols.filter(protocol => {
    const matchesSearch = protocol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         protocol.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const runs = parsedRuns.filter(r => r.protocolId === protocol.id);
    const hasPendingRuns = runs.some(r => r.status === "OPEN");
    const hasCompletedRuns = runs.some(r => r.status === "COMPLETED");

    if (activeTab === "active") return protocol.status === "ACTIVE" && hasPendingRuns;
    if (activeTab === "pending") return hasPendingRuns;
    if (activeTab === "completed") return hasCompletedRuns;
    
    return true;
  });

  // KPIs
  const totalProtocols = parsedProtocols.length;
  const activeProtocols = parsedProtocols.filter(p => p.status === "ACTIVE").length;
  const pendingRuns = parsedRuns.filter(r => r.status === "OPEN").length;
  const completedToday = parsedRuns.filter(r => {
    if (!r.completedAt) return false;
    const today = new Date().toISOString().split("T")[0];
    const completedDate = r.completedAt.toISOString().split("T")[0];
    return completedDate === today;
  }).length;
  
  // Calculate compliance from checks
  const completedRuns = parsedRuns.filter(r => r.status === "COMPLETED");
  const complianceRate = completedRuns.length > 0 
    ? Math.round((completedRuns.filter(r => r.checks.every(c => c.passed)).length / completedRuns.length) * 100)
    : 100;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header con glassmorphism */}
      <div className="sb-header-glass">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">APPCC - Puntos de Control Crítico</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestión de controles APPCC y protocolos de calidad
            </p>
          </div>
        </div>

        {/* KPIs - Neutral and elegant */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="sb-card-glass-light p-4">
            <p className="text-xs text-muted-foreground mb-1">Protocolos Activos</p>
            <p className="text-2xl font-bold text-foreground">{activeProtocols}/{totalProtocols}</p>
          </div>
          <div className="sb-card-glass-light p-4">
            <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-foreground">{pendingRuns}</p>
          </div>
          <div className="sb-card-glass-light p-4">
            <p className="text-xs text-muted-foreground mb-1">Completados Hoy</p>
            <p className="text-2xl font-bold text-foreground">{completedToday}</p>
          </div>
          <div className="sb-card-glass-light p-4">
            <p className="text-xs text-muted-foreground mb-1">Compliance</p>
            <p className="text-2xl font-bold text-foreground">{complianceRate}%</p>
          </div>
          <div className="sb-card-glass-light p-4">
            <p className="text-xs text-muted-foreground mb-1">No Conformes</p>
            <p className="text-2xl font-bold text-foreground">
              {completedRuns.filter(r => !r.checks.every(c => c.passed)).length}
            </p>
          </div>
        </div>

        {/* Search y Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <input
              type="search"
              placeholder="Buscar protocolos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sb-input w-full"
            />
          </div>
          
          <div className="sb-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "active"}
              onClick={() => setActiveTab("active")}
              className={activeTab === "active" ? "active" : ""}
            >
              Activos
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "pending"}
              onClick={() => setActiveTab("pending")}
              className={activeTab === "pending" ? "active" : ""}
            >
              Pendientes
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "completed"}
              onClick={() => setActiveTab("completed")}
              className={activeTab === "completed" ? "active" : ""}
            >
              Completados
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de protocolos */}
      <div className="sb-card-glass-light p-5">
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">
                  Protocolo
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">
                  Categoría
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">
                  Frecuencia
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">
                  Estado
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">
                  Última Ejecución
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProtocols.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    No se encontraron protocolos
                  </td>
                </tr>
              ) : (
                filteredProtocols.map(protocol => {
                  const protocolRuns = parsedRuns.filter(r => r.protocolId === protocol.id);
                  const lastRun = protocolRuns
                    .filter(r => r.completedAt)
                    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];
                  const hasPending = protocolRuns.some(r => r.status === "OPEN");

                  return (
                    <tr
                      key={protocol.id}
                      className="border-b border-border/30 hover:bg-accent/5 cursor-pointer transition-colors"
                      onClick={() => setSelectedProtocol(protocol)}
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{protocol.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {protocol.description}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="sb-badge--default flex items-center gap-1 w-fit">
                          {protocol.category === "TEMPERATURA" ? (
                            <><Thermometer className="w-3 h-3 text-destructive" /> Temperatura</>
                          ) : protocol.category === "LIMPIEZA" ? (
                            <>Limpieza</>
                          ) : protocol.category === "PRODUCCION" ? (
                            <><Factory className="w-3 h-3 text-muted-foreground" /> Producción</>
                          ) : protocol.category === "PLAGAS" ? (
                            <><Bug className="w-3 h-3 text-warning" /> Plagas</>
                          ) : protocol.category === "AGUAS" ? (
                            <><Droplets className="w-3 h-3 text-info" /> Aguas</>
                          ) : (
                            protocol.category
                          )}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          {protocol.frequency === "DAILY" ? (
                            <><Calendar className="w-3.5 h-3.5" /> Diario</>
                          ) : protocol.frequency === "WEEKLY" ? (
                            <><CalendarDays className="w-3.5 h-3.5" /> Semanal</>
                          ) : protocol.frequency === "PER_BATCH" ? (
                            <><Factory className="w-3.5 h-3.5" /> Por Lote</>
                          ) : protocol.frequency === "MONTHLY" ? (
                            <><Calendar className="w-3.5 h-3.5" /> Mensual</>
                          ) : (
                            <><Clock className="w-3.5 h-3.5" /> {protocol.frequency || "N/A"}</>
                          )}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`sb-badge--${
                          hasPending ? "warning" :
                          protocol.status === "ACTIVE" ? "success" :
                          "default"
                        }`}>
                          {hasPending ? "Pendiente" :
                           protocol.status === "ACTIVE" ? "Activo" :
                           "Inactivo"}
                        </span>
                      </td>
                      <td className="p-3">
                        {lastRun ? (
                          <div>
                            <p className="text-sm">
                              {lastRun.completedAt!.toLocaleDateString("es-ES")}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {lastRun.checks.every(c => c.passed) ? (
                                <><CheckCircle2 className="w-3 h-3 text-success" /> Conforme</>
                              ) : (
                                <><XCircle className="w-3 h-3 text-destructive" /> No conforme</>
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin ejecutar</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProtocol(protocol);
                          }}
                          className="sb-btn--primary text-sm px-3 py-1.5"
                        >
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de control APPCC */}
      {selectedProtocol && (
        <AppccControlDrawer
          protocol={selectedProtocol}
          protocolRuns={parsedRuns.filter(r => r.protocolId === selectedProtocol.id)}
          documents={documents.filter(d => 
            d.linkedEntity?.type === "protocol" && d.linkedEntity?.id === selectedProtocol.id
          )}
          onClose={() => setSelectedProtocol(null)}
        />
      )}
    </div>
  );
}
