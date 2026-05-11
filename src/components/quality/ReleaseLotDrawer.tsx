"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Building2,
  Package,
} from "lucide-react";
import { BaseDrawer } from "@/components/drawers/BaseDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input, Textarea as SBTextarea, SBButton } from "@/components/ui/ui-primitives";
import { PhotoUploadButton, type PhotoFile } from "@/components/warehouse/PhotoUploadButton";
import { QualityBadge } from "./QualityBadge";
import { QcTestCard } from "./QcTestCard";
import {
  getQcTestsForLot,
  releaseOrRejectLot,
  startQcReview,
} from "@/server/actions/quality.actions";
import { uploadMultipleFiles, generateQualityCoAPath } from "@/lib/firebase-storage";
import type { QcTest } from "@/domain/ssot";
import type { LotReleaseTableRow, QualityReleaseFormData } from "@/types/quality";
import { QC_STATUS_META } from "@/domain/ssot";

interface ReleaseLotDrawerProps {
  lot: LotReleaseTableRow;
  onClose: () => void;
  onUpdate?: () => void;
}

type DecisionMode = "APPROVED" | "REJECTED" | "CONDITIONAL" | "HOLD";

export function ReleaseLotDrawer({ lot, onClose, onUpdate }: ReleaseLotDrawerProps) {
  const [activeTab, setActiveTab] = useState<"tests" | "info" | "docs">("tests");
  const [tests, setTests] = useState<QcTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<DecisionMode>("APPROVED");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [conditions, setConditions] = useState<string[]>(lot.qcConditions || []);
  const [newCondition, setNewCondition] = useState("");
  const [attachments, setAttachments] = useState<PhotoFile[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await getQcTestsForLot(lot.lotNumber);
        if (result.success && Array.isArray(result.data)) {
          setTests(result.data as QcTest[]);
        } else if (!result.success) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("[ReleaseLotDrawer] Failed to load tests", error);
        toast.error("No se pudieron cargar los tests del lote");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [lot.lotNumber]);

  const qcMeta = QC_STATUS_META[lot.qcStatus];

  const passRate = useMemo(() => {
    if (!tests.length) return 0;
    const passed = tests.filter(test => test.result === "PASS" || test.inSpec).length;
    return (passed / tests.length) * 100;
  }, [tests]);

  const handleAddCondition = () => {
    if (!newCondition.trim()) return;
    setConditions(prev => [...prev, newCondition.trim()]);
    setNewCondition("");
  };

  const uploadAttachments = async () => {
    if (attachments.length === 0) return { urls: [] as string[], errors: [] as string[] };
    const storagePath = generateQualityCoAPath(lot.lotNumber);
    const { urls, errors } = await uploadMultipleFiles(
      attachments.map(photo => photo.file),
      storagePath
    );
    if (errors.length) {
      toast.warning(`Algunos archivos no se subieron: ${errors.join(", ")}`);
    }
    return { urls, errors };
  };

  const buildFormData = async (
    decisionType: DecisionMode,
    extra?: Partial<QualityReleaseFormData>
  ): Promise<QualityReleaseFormData> => {
    const uploadResult = await uploadAttachments();
    const [primaryCoaUrl, ...restUrls] = uploadResult.urls;

    const attachmentsMeta =
      restUrls.length > 0
        ? restUrls.map((url, index) => {
          const file = attachments[index + 1];
          return {
            name: file?.file.name ?? `adjunto-${index + 1}`,
            url,
            type: file?.file.type ?? "application/octet-stream",
          };
        })
        : undefined;

    return {
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      sku: lot.sku ?? lot.itemId ?? "",
      itemId: lot.itemId ?? lot.sku ?? "",
      decision: decisionType,
      reason: extra?.reason,
      observations: extra?.observations ?? decisionNotes,
      conditions: decisionType === "CONDITIONAL" ? conditions : undefined,
      testsPerformed: tests.map(test => ({
        parameterId: test.parameterId,
        parameterName: test.parameterName ?? test.parameterId,
        value: String(test.value ?? test.valueNumeric ?? test.valueText ?? ""),
        result: test.result ?? "NA",
        inSpec: Boolean(test.inSpec),
        spec: test.spec
          ? {
            min: test.spec.min,
            max: test.spec.max,
            target: test.spec.target,
            unit: test.spec.unit,
          }
          : undefined,
      })),
      coaUrl: primaryCoaUrl ?? lot.qcCoaUrl ?? lot.qcCoa,
      photosUrls: uploadResult.urls,
      attachments: attachmentsMeta,
      reviewDuration: extra?.reviewDuration,
      correctiveActions: extra?.correctiveActions,
    };
  };

  const handleDecisionSubmit = async (mode: DecisionMode) => {
    try {
      if (mode === "REJECTED" && !rejectionReason.trim()) {
        toast.error("Debes indicar el motivo del rechazo.");
        return;
      }
      if (mode === "APPROVED" && !decisionNotes.trim()) {
        toast.error("Añade observaciones antes de aprobar.");
        return;
      }
      if (mode === "CONDITIONAL" && conditions.length === 0) {
        toast.error("Define al menos una condición para la aprobación condicional.");
        return;
      }

      setSubmitting(true);
      const formData = await buildFormData(mode, {
        reason: mode === "REJECTED" ? rejectionReason : undefined,
      });

      const result = await releaseOrRejectLot(formData, "current-user-id"); // TODO: obtain real user id
      if (!result.success) {
        toast.error(result.error ?? "Error al procesar la decisión");
        return;
      }

      toast.success("Decisión registrada correctamente");
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error("[ReleaseLotDrawer] Error submitting decision", error);
      toast.error("No se pudo completar la acción, inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartReview = async () => {
    try {
      setSubmitting(true);
      const res = await startQcReview(lot.lotNumber, "current-user-id"); // TODO: user id
      if (!res.success) {
        toast.error(res.error ?? "No se pudo iniciar la revisión");
        return;
      }
      toast.success("Revisión iniciada");
      onUpdate?.();
    } catch (error) {
      console.error("[ReleaseLotDrawer] startReview error", error);
      toast.error("Error al iniciar la revisión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseDrawer
      open
      onClose={onClose}
      title={`Lote ${lot.lotNumber}`}
      subtitle={lot.itemName}
      actions={
        <div className="flex gap-2">
          <SBButton
            variant="ghost"
            size="sm"
            onClick={handleStartReview}
            disabled={submitting || lot.qcStatus === "IN_PROGRESS"}
          >
            Revisar
          </SBButton>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Lot summary */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sb-glass rounded-xl border border-border/40 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Estado actual</p>
              <div className="mt-1 flex items-center gap-2">
                <QualityBadge status={lot.qcStatus} />
                <span className="text-xs text-muted-foreground">{qcMeta?.canSell ? "Liberado para uso" : "Bloqueado"}</span>
              </div>
            </div>
            <div className="sb-glass rounded-xl border border-border/40 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Proveedor</p>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-muted-foreground" />
                <span className="font-medium truncate">{lot.supplierName ?? lot.supplier ?? "N/D"}</span>
              </div>
            </div>
            <div className="sb-glass rounded-xl border border-border/40 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Días en espera</p>
              <p className="text-lg font-semibold">{lot.daysInHold}</p>
            </div>
            <div className="sb-glass rounded-xl border border-border/40 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan QC</p>
              <p className="text-sm font-medium">{lot.qcPlanName ?? "Sin plan asignado"}</p>
            </div>
          </section>

          <Tabs value={activeTab} onValueChange={tab => setActiveTab(tab as typeof activeTab)}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="docs">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="tests" className="space-y-4">
              {tests.length === 0 ? (
                <div className="sb-glass rounded-xl border border-border/40 p-6 text-center">
                  <AlertCircle className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No hay tests registrados para este lote.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {tests.length} tests registrados · Pass rate {passRate.toFixed(0)}%
                    </p>
                  </div>
                  <div className="space-y-3">
                    {tests.map(test => (
                      <QcTestCard
                        key={test.id ?? `${test.parameterId}-${test.testedAt}`}
                        test={{
                          ...test,
                          parameterName: test.parameterName ?? test.parameterId,
                          result: test.result ?? 'NA',
                          inSpec: test.inSpec ?? false,
                          value: test.value ?? 'N/A'
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="info" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow label="SKU" value={lot.sku} icon={<Package size={14} />} />
                <DetailRow
                  label="Recepción"
                  value={lot.receptionDate.toLocaleDateString("es-ES")}
                  icon={<Calendar size={14} />}
                />
                <DetailRow
                  label="Responsable"
                  value={lot.qcReviewOwnerName ?? "Sin asignar"}
                  icon={<User size={14} />}
                />
                <DetailRow
                  label="Condiciones"
                  value={
                    lot.qcConditions && lot.qcConditions.length
                      ? lot.qcConditions.join(", ")
                      : "Sin condiciones previas"
                  }
                  icon={<AlertTriangle size={14} />}
                />
              </div>
            </TabsContent>

            <TabsContent value="docs" className="space-y-4">
              <PhotoUploadButton
                photos={attachments}
                onChange={setAttachments}
                maxPhotos={5}
                label="Adjuntar CoA / documentación"
                helperText="Admite imágenes o PDFs. El primer archivo será considerado como CoA."
              />
              {lot.qcCoaUrl && (
                <div className="sb-glass rounded-xl border border-border/40 p-3 text-sm">
                  <p className="font-semibold">CoA existente</p>
                  <a
                    href={lot.qcCoaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline text-xs"
                  >
                    Ver documento actual
                  </a>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Decision section */}
          <section className="sb-glass rounded-2xl border border-border/40 p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <DecisionButton
                label="Aprobar"
                icon={<CheckCircle2 size={16} />}
                active={decision === "APPROVED"}
                onClick={() => setDecision("APPROVED")}
              />
              <DecisionButton
                label="Rechazar"
                tone="destructive"
                icon={<XCircle size={16} />}
                active={decision === "REJECTED"}
                onClick={() => setDecision("REJECTED")}
              />
              <DecisionButton
                label="Condicional"
                tone="warning"
                icon={<AlertTriangle size={16} />}
                active={decision === "CONDITIONAL"}
                onClick={() => setDecision("CONDITIONAL")}
              />
              <DecisionButton
                label="Retener"
                tone="info"
                icon={<AlertCircle size={16} />}
                active={decision === "HOLD"}
                onClick={() => setDecision("HOLD")}
              />
            </div>

            {decision === "REJECTED" && (
              <TextareaField
                label="Motivo del rechazo"
                placeholder="Describe la causa del rechazo..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
            )}

            {decision === "CONDITIONAL" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newCondition}
                    onChange={e => setNewCondition(e.target.value)}
                    placeholder="Añade condición..."
                  />
                  <SBButton variant="secondary" onClick={handleAddCondition}>
                    Añadir
                  </SBButton>
                </div>
                {conditions.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {conditions.map((condition, index) => (
                      <li
                        key={`${condition}-${index}`}
                        className="rounded-md bg-warning/10 px-3 py-2 flex items-center justify-between"
                      >
                        <span>{condition}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setConditions(prev => prev.filter((_, idx) => idx !== index))
                          }
                          className="text-warning hover:text-warning/80"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <TextareaField
              label="Notas / observaciones"
              placeholder="Añade comentarios adicionales…"
              value={decisionNotes}
              onChange={e => setDecisionNotes(e.target.value)}
            />

            <SBButton
              variant={
                decision === "APPROVED"
                  ? "primary"
                  : decision === "REJECTED"
                    ? "destructive"
                    : decision === "CONDITIONAL"
                      ? "secondary"
                      : "secondary"
              }
              onClick={() => handleDecisionSubmit(decision)}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                "Confirmar decisión"
              )}
            </SBButton>
          </section>
        </div>
      )}
    </BaseDrawer>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="sb-glass rounded-xl border border-border/40 p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-sm">
        {icon}
        <span className="font-medium truncate">{value}</span>
      </div>
    </div>
  );
}

function DecisionButton({
  label,
  icon,
  active,
  tone = "primary",
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  tone?: "primary" | "warning" | "destructive" | "info";
  onClick: () => void;
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: "border-primary text-primary",
    warning: "border-warning text-warning",
    destructive: "border-destructive text-destructive",
    info: "border-info text-info",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? `${toneClasses[tone]} bg-background` : "border-border text-muted-foreground"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TextareaField({
  label,
  ...props
}: React.ComponentProps<typeof TextareaElement> & { label?: string }) {
  return (
    <label className="space-y-2 text-sm w-full">
      {label && <span className="font-medium text-foreground">{label}</span>}
      <TextareaElement className="sb-textarea" {...props} />
    </label>
  );
}

const TextareaElement = SBTextarea;
