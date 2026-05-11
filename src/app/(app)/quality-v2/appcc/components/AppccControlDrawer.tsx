"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { 
  X, 
  ClipboardList, 
  BarChart2, 
  Paperclip, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Circle,
  Check,
  FileText,
  Award,
  Image as ImageIcon,
  Plus
} from "lucide-react";
import type { ProductionProtocol, ProductionProtocolRun, Document } from "@/domain/ssot-v2-plus-schemas";

interface AppccControlDrawerProps {
  protocol: ProductionProtocol;
  protocolRuns: ProductionProtocolRun[];
  documents: Document[];
  onClose: () => void;
}

type TabType = "registro" | "historico" | "documentos";

export function AppccControlDrawer({ protocol, protocolRuns, documents, onClose }: AppccControlDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("registro");
  
  // Campos automáticos (readonly)
  const fecha = new Date().toISOString().split('T')[0];
  const responsable = "system"; // TODO: usuario activo

  // Runs ordenados por fecha
  const sortedRuns = [...protocolRuns].sort((a, b) => 
    b.startedAt.getTime() - a.startedAt.getTime()
  );

  const latestRun = sortedRuns[0];
  const isPending = latestRun?.status === "OPEN";

  return (
    <>
      <div className="sb-overlay" data-state="open" onClick={onClose} />
      
      <aside className="sb-drawer" data-state="open">
        {/* Handle para mobile */}
        <div className="sb-drawer__handle" />

        {/* Header */}
        <header className="sb-drawer__header">
          <div className="flex-1">
            <h2 className="text-xl font-bold">{protocol.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {protocol.code} • v{protocol.version}
            </p>
          </div>
          <button
            onClick={onClose}
            className="sb-btn--ghost w-8 h-8 p-0 flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tabs - Professional icons */}
        <nav className="border-b border-border px-5">
          <div className="flex gap-1">
            <button
              role="tab"
              aria-selected={activeTab === "registro"}
              onClick={() => setActiveTab("registro")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "registro" 
                  ? "border-accent text-accent" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Registro
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "historico"}
              onClick={() => setActiveTab("historico")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "historico" 
                  ? "border-accent text-accent" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Histórico
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "documentos"}
              onClick={() => setActiveTab("documentos")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "documentos" 
                  ? "border-accent text-accent" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Paperclip className="w-4 h-4" />
              Documentos
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {activeTab === "registro" && (
            <>
              {/* Banner de estado - Refined colors */}
              {isPending ? (
                <div className="rounded-lg border-l-4 border-warning bg-secondary p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Control Pendiente</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Este protocolo tiene un control pendiente de completar
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-l-4 border-success bg-secondary p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Última ejecución conforme</p>
                      {latestRun?.completedAt && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Completado el {latestRun.completedAt.toLocaleDateString("es-ES")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Información del protocolo */}
              <div className="sb-card-glass-light p-5 rounded-lg">
                <h3 className="font-semibold mb-4">Información del Protocolo</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Categoría</p>
                    <p className="font-medium">{protocol.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
                    <p className="font-medium">
                      {protocol.frequency === "DAILY" ? "Diario" :
                       protocol.frequency === "WEEKLY" ? "Semanal" :
                       protocol.frequency === "MONTHLY" ? "Mensual" :
                       protocol.frequency === "PER_BATCH" ? "Por Lote" :
                       protocol.frequency || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Obligatorio</p>
                    <p className="font-medium">{protocol.isMandatory ? "Sí" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Estado</p>
                    <span className="sb-badge--default">
                      {protocol.status}
                    </span>
                  </div>
                </div>
                {protocol.description && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm">{protocol.description}</p>
                  </div>
                )}
              </div>

              {/* Pasos del protocolo */}
              <div className="sb-card-glass-light p-5 rounded-lg">
                <h3 className="font-semibold mb-4">Pasos a Realizar</h3>
                <div className="space-y-3">
                  {protocol.steps.map((step, index) => (
                    <div key={step.id} className="flex gap-3 p-4 rounded-lg bg-secondary/30">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-foreground 
                                    flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{step.title}</p>
                          {step.required && (
                            <span className="text-xs text-destructive">*</span>
                          )}
                          <span className="sb-badge--default text-xs">
                            {step.kind}
                          </span>
                        </div>
                        {step.description && (
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        )}
                        
                        {/* Mostrar reglas según tipo */}
                        {step.kind === "MEASURE" && step.rule.measure && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Rango: {step.rule.measure.min} - {step.rule.measure.max} {step.rule.measure.unit}
                          </div>
                        )}
                        {step.kind === "SIGN" && step.rule.sign && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Requiere firma: {step.rule.sign.role}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campos automáticos */}
              <div className="sb-card-glass-light p-5 rounded-lg">
                <h3 className="font-semibold mb-4">Información de Control</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">
                      Fecha
                    </label>
                    <input
                      type="text"
                      value={fecha}
                      readOnly
                      className="sb-input w-full bg-muted/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">
                      Responsable
                    </label>
                    <input
                      type="text"
                      value={responsable}
                      readOnly
                      className="sb-input w-full bg-muted/50"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "historico" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Historial de Ejecuciones</h3>
                <span className="text-sm text-muted-foreground">
                  {sortedRuns.length} ejecuciones
                </span>
              </div>

              {sortedRuns.length === 0 ? (
                <div className="sb-card-glass-light p-8 text-center rounded-lg">
                  <p className="text-muted-foreground">No hay ejecuciones registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedRuns.map((run, index) => {
                    const allPassed = run.checks.every(c => c.passed);
                    const isLatest = index === 0;

                    return (
                      <div 
                        key={run.id}
                        className="sb-card-glass-light p-4 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {run.status === "COMPLETED" ? (
                              allPassed ? (
                                <CheckCircle2 className="w-5 h-5 text-success" />
                              ) : (
                                <XCircle className="w-5 h-5 text-destructive" />
                              )
                            ) : run.status === "OPEN" ? (
                              <Clock className="w-5 h-5 text-warning" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">
                                {run.status === "COMPLETED" ? "Completado" :
                                 run.status === "OPEN" ? "En Progreso" :
                                 run.status === "BLOCKED" ? "Bloqueado" :
                                 "Cancelado"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {run.startedAt.toLocaleString("es-ES")}
                              </p>
                            </div>
                          </div>
                          {isLatest && (
                            <span className="sb-badge--default text-xs">Último</span>
                          )}
                        </div>

                        {/* Checks summary */}
                        {run.checks.length > 0 && (
                          <div className="space-y-2">
                            {run.checks.map(check => (
                              <div key={check.stepId} className="text-sm">
                                <div className="flex items-center gap-2">
                                  {check.passed ? (
                                    <Check className="w-4 h-4 text-success" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  )}
                                  <span className="text-muted-foreground">
                                    {protocol.steps.find(s => s.id === check.stepId)?.title || check.stepId}
                                  </span>
                                  {check.value !== undefined && (
                                    <span className="ml-auto font-medium">
                                      {check.value} {check.unit}
                                    </span>
                                  )}
                                </div>
                                {check.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 ml-6">{check.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "documentos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Documentos Relacionados</h3>
                <button className="sb-btn--secondary flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  Adjuntar
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="sb-card-glass-light p-8 text-center rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    No hay documentos vinculados a este protocolo
                  </p>
                  <button className="sb-btn--secondary">
                    Adjuntar Documento
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => {
                    const DocIcon = doc.type === "PHOTO" ? ImageIcon :
                                   doc.type === "CERTIFICATE" ? Award :
                                   doc.type === "PROTOCOL" ? ClipboardList :
                                   FileText;
                    
                    return (
                      <div key={doc.id} className="sb-card-glass-light p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <DocIcon className="w-8 h-8 text-accent flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium line-clamp-1">{doc.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              v{doc.version} • {doc.createdAt.toLocaleDateString("es-ES")}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className={`sb-badge--${
                                doc.status === "APPROVED" ? "success" :
                                doc.status === "IN_REVIEW" ? "warning" :
                                "default"
                              }`}>
                                {doc.status}
                              </span>
                              <span className="sb-badge--default">
                                {doc.type}
                              </span>
                            </div>
                          </div>
                          <button className="sb-btn--ghost px-2">
                            Ver
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="sb-drawer__footer">
          <button onClick={onClose} className="sb-btn--secondary flex-1">
            Cerrar
          </button>
          {activeTab === "registro" && (
            <button className="sb-btn--primary flex-1">
              Guardar Borrador
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}
