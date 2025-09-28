// src/features/warehouse/components/QuickGoodsReceiptDialog.tsx
"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import type { Party, Item, Uom, ItemCategory, PartyRole } from "@/domain/ssot";
import { createGoodsReceipt, createSupplier, createItem, reportIncident } from "@/app/(app)/warehouse/goods-receipt/actions";
import { Plus, Trash2, Truck, AlertTriangle, Factory, PackagePlus, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Line = {
  key: string;
  itemId: string;
  supplierLot: string;
  qty: number;
  unitCost?: number;
  uom?: Uom;
  locationId?: string; // destino
  autoLot?: boolean;
  expiryAt?: string | null;
};

type IncidentDraft = {
  hasIncident: boolean;
  kind: "DAMAGED" | "MISSING" | "DOCUMENT" | "OTHER";
  severity: "LOW" | "MEDIUM" | "HIGH";
  notes: string;
};

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

// Generador simple de lotes automáticos (ajusta a tu convención)
function generateLotNumber(item: Item | undefined) {
  const dt = new Date();
  const y = String(dt.getUTCFullYear()).slice(2);
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const base = item?.id?.split("_").pop()?.toUpperCase().slice(0, 3) ?? "ITM";
  // Prefijo por tipo de ítem (muy simple; puedes sofisticar con category)
  const prefix = (item as any)?.categoryId?.startsWith("rm") ? "L" + base : "FG-" + base;
  const rand = Math.floor(Math.random() * 89) + 10; // 2 dígitos
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function QuickGoodsReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (info: { receiptId: string; receiptNumber: string }) => void;
}) {
  const { data } = useData();

  const parties = data?.parties as Party[] | undefined;
  const roles = data?.partyRoles as PartyRole[] | undefined;
  const itemsAll = data?.items as Item[] | undefined;
  const categories = (data as any)?.itemCategories as ItemCategory[] | undefined;

  const suppliers = useMemo(() => {
    if (!parties || !roles) return [];
    const supplierIds = new Set(roles.filter((r) => r.role === "SUPPLIER").map((r) => r.partyId));
    return parties.filter((p) => supplierIds.has(p.id));
  }, [parties, roles]);

  const items = useMemo(() => itemsAll ?? [], [itemsAll]);

  // Estado del formulario
  const [date, setDate] = useState(nowIsoDate());
  const [supplierId, setSupplierId] = useState<string>("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [defaultLocation, setDefaultLocation] = useState<string>("RM/MAIN");
  const [lines, setLines] = useState<Line[]>([
    { key: `q_${Date.now()}`, itemId: "", supplierLot: "", qty: 0, autoLot: true, locationId: "RM/MAIN" },
  ]);
  const [incident, setIncident] = useState<IncidentDraft>({ hasIncident: false, kind: "OTHER", severity: "LOW", notes: "" });

  const [saving, setSaving] = useState(false);

  // Mini modales de alta rápida
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState<null | number>(null); // índice de línea a asignar tras crear

  // Recalcular destino sugerido por categoría cuando cambie defaultLocation
  useEffect(() => {
    setLines((curr) =>
      curr.map((l) => ({ ...l, locationId: l.locationId ?? defaultLocation }))
    );
  }, [defaultLocation]);

  // Helpers
  const setLine = (idx: number, patch: Partial<Line>) =>
    setLines((curr) => {
      const next = [...curr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const addLine = () =>
    setLines((l) => [
      ...l,
      { key: `q_${Date.now()}_${Math.random()}`, itemId: "", supplierLot: "", qty: 0, autoLot: true, locationId: defaultLocation },
    ]);

  const rmLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));

  const selectedItem = (id?: string) => items.find((it) => it.id === id);

  const suggestLocationForItem = (it?: Item) => {
    if (!it) return defaultLocation;
    const catCode = (it.category || '').toUpperCase();
    if (catCode.startsWith("RAW")) return "RM/MAIN";
    if (catCode.startsWith("FG")) return "FG/MAIN";
    if (catCode.startsWith("PACK")) return "PKG/MAIN";
    return defaultLocation;
  };

  // Validación
  const missing =
    !supplierId ||
    !deliveryNote ||
    !date ||
    lines.length === 0 ||
    lines.some((l) => !l.itemId || !l.qty || l.qty <= 0);

  // Guardar
  const save = async () => {
    if (missing) {
      toast.error("Revisa: proveedor, albarán, fecha y líneas (SKU y cantidad > 0).");
      return;
    }

    setSaving(true);
    try {
      // Normaliza líneas, aplica lotes automáticos y datos de item
      const payloadLines = lines.map((l) => {
        const it = selectedItem(l.itemId);
        const lot = l.supplierLot?.trim() || (l.autoLot ? generateLotNumber(it) : "");
        const uom = l.uom || it?.uom || ("unit" as Uom);
        const unitCost = l.unitCost ?? it?.stdCost ?? 0;
        const locationId = l.locationId || suggestLocationForItem(it);
        return {
          itemId: l.itemId,
          supplierLot: lot,
          qty: Number(l.qty),
          uom,
          unitCost,
          locationId,
          expiryAt: l.expiryAt,
        };
      });

      const res = await createGoodsReceipt({
        supplierId,
        deliveryNote: deliveryNote.trim(),
        receiptDate: date,
        lines: payloadLines,
      });

      if (incident.hasIncident) {
        try {
          await reportIncident({
            scope: "GOODS_RECEIPT",
            refId: res.receiptId,
            kind: incident.kind,
            severity: incident.severity,
            notes: incident.notes?.trim(),
          });
        } catch (e) {
          // No bloquea la entrada
          console.warn("Incident report failed", e);
          toast.warning("Guardado, pero no se pudo registrar la incidencia.");
        }
      }

      toast.success("Recepción creada correctamente.");
      onSuccess?.(res);
      onOpenChange(false);
      // reset
      setSupplierId("");
      setDeliveryNote("");
      setDate(nowIsoDate());
      setLines([{ key: `q_${Date.now()}`, itemId: "", supplierLot: "", qty: 0, autoLot: true, locationId: defaultLocation }]);
      setIncident({ hasIncident: false, kind: "OTHER", severity: "LOW", notes: "" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Error al guardar recepción.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SBDialog open={open} onOpenChange={onOpenChange}>
        <SBDialogContent
          title={
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Entrada rápida de mercancía
            </div>
          }
          maxWidth="50rem"
        >
          <div className="space-y-5">
            {/* Cabecera */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Proveedor</span>
                <div className="flex gap-2">
                  <Select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                    aria-invalid={!supplierId}
                  >
                    <option value="">Selecciona proveedor…</option>
                    {(suppliers || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    className="sb-btn text-[color:var(--sb-accent-logistica)] border border-[color:var(--sb-accent-logistica)] hover:bg-[color:var(--sb-accent-logistica)/0.08]"
                    onClick={() => setNewSupplierOpen(true)}
                    title="Crear proveedor"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Albarán</span>
                <Input
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Ej: 2025/ABC-001"
                  required
                  aria-invalid={!deliveryNote}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Fecha</span>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
            </div>
            
            {/* Líneas */}
            <div className="space-y-3 rounded-md border p-3">
              <div className="text-sm font-medium mb-1">Líneas</div>
              {lines.map((ln, i) => {
                const it = selectedItem(ln.itemId);
                return (
                  <div key={ln.key} className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr,0.9fr,1fr,1fr,auto] gap-2 items-center">
                    {/* Item */}
                    <div className="flex gap-2">
                      <Select
                        value={ln.itemId}
                        onChange={(e) => {
                          const itemId = e.target.value;
                          const itSel = selectedItem(itemId);
                          setLine(i, {
                            itemId,
                            uom: itSel?.uom ?? ln.uom,
                            unitCost: itSel?.stdCost ?? ln.unitCost,
                            locationId: suggestLocationForItem(itSel),
                          });
                        }}
                        required
                        aria-invalid={!ln.itemId}
                      >
                        <option value="">Selecciona un ítem…</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        className="sb-btn border text-[color:var(--sb-accent-logistica)] border-[color:var(--sb-accent-logistica)] hover:bg-[color:var(--sb-accent-logistica)/0.08]"
                        onClick={() => setNewItemOpen(i)}
                        title="Crear SKU"
                      >
                        <PackagePlus className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Lote proveedor */}
                    <div className="grid gap-1">
                      <Input
                        placeholder={ln.autoLot ? "Se generará automáticamente" : "Lote del proveedor"}
                        value={ln.supplierLot}
                        onChange={(e) => setLine(i, { supplierLot: e.target.value })}
                        disabled={ln.autoLot}
                      />
                      <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          className="accent-[color:var(--sb-accent-logistica)]"
                          checked={!!ln.autoLot}
                          onChange={(e) => setLine(i, { autoLot: e.target.checked })}
                        />
                        Generar lote automático si está vacío
                      </label>
                    </div>

                    {/* Cantidad */}
                    <Input
                      type="number"
                      placeholder="Cantidad"
                      min={0}
                      step="any"
                      value={ln.qty || ""}
                      onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })}
                      aria-invalid={!ln.qty || ln.qty <= 0}
                    />

                    {/* UdM */}
                    <Select value={ln.uom || it?.uom || "unit"} onChange={(e) => setLine(i, { uom: e.target.value as Uom })}>
                      <option value="unit">unit</option>
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="g">g</option>
                      <option value="mL">mL</option>
                    </Select>

                    {/* Coste unitario */}
                    <Input
                      type="number"
                      placeholder={it?.stdCost != null ? String(it.stdCost) : "0"}
                      min={0}
                      step="any"
                      value={ln.unitCost ?? ""}
                      onChange={(e) => setLine(i, { unitCost: Number(e.target.value) })}
                    />
                    
                     {/* Fecha Caducidad */}
                    <Input
                        type="date"
                        value={ln.expiryAt ?? ''}
                        onChange={(e) => setLine(i, { expiryAt: e.target.value || null })}
                    />

                    {/* Eliminar */}
                    <div className="justify-self-end">
                      <button className="p-2 hover:bg-zinc-100 rounded" onClick={() => rmLine(i)} title="Eliminar línea">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <SBButton variant="secondary" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" /> Añadir línea
              </SBButton>
            </div>

            {/* Incidencias */}
            <div className="rounded-md border">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <div className="text-sm font-medium">Incidencias en la recepción</div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-[color:var(--sb-accent-logistica)]"
                    checked={incident.hasIncident}
                    onChange={(e) => setIncident((s) => ({ ...s, hasIncident: e.target.checked }))}
                  />
                  Reportar
                </label>
              </div>
              {incident.hasIncident && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-3 pb-3">
                  <label className="grid gap-1.5">
                    <span className="text-sm">Tipo</span>
                    <Select
                      value={incident.kind}
                      onChange={(e) => setIncident((s) => ({ ...s, kind: e.target.value as IncidentDraft["kind"] }))}
                    >
                      <option value="DAMAGED">Daños</option>
                      <option value="MISSING">Faltas</option>
                      <option value="DOCUMENT">Documental</option>
                      <option value="OTHER">Otro</option>
                    </Select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm">Severidad</span>
                    <Select
                      value={incident.severity}
                      onChange={(e) => setIncident((s) => ({ ...s, severity: e.target.value as IncidentDraft["severity"] }))}
                    >
                      <option value="LOW">Baja</option>
                      <option value="MEDIUM">Media</option>
                      <option value="HIGH">Alta</option>
                    </Select>
                  </label>
                  <label className="grid gap-1.5 md:col-span-3">
                    <span className="text-sm">Notas</span>
                    <Input
                      placeholder="Describe brevemente la incidencia…"
                      value={incident.notes}
                      onChange={(e) => setIncident((s) => ({ ...s, notes: e.target.value }))}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-zinc-500">
                <span className={clsx("inline-block h-2 w-2 rounded-full mr-1")} style={{ backgroundColor: "var(--sb-accent-logistica)" }} />
                Guardará movimientos en la ubicación seleccionada y creará lotes si procede.
              </div>
              <SBButton onClick={save} disabled={saving || missing}>
                {saving ? "Guardando…" : "Guardar"}
              </SBButton>
            </div>
          </div>
        </SBDialogContent>
      </SBDialog>

      {/* Modal Alta Rápida Proveedor */}
      {newSupplierOpen && (
        <CreateSupplierDialog
          open={newSupplierOpen}
          onOpenChange={setNewSupplierOpen}
          onCreated={(party) => {
            toast.success("Proveedor creado.");
            setSupplierId(party.id);
          }}
        />
      )}

      {/* Modal Alta Rápida Ítem */}
      {newItemOpen != null && (
        <CreateItemDialog
          open={newItemOpen != null}
          onOpenChange={() => setNewItemOpen(null)}
          onCreated={(it) => {
            toast.success("SKU creado.");
            setLine(newItemOpen!, { itemId: it.id, uom: it.uom, unitCost: it.stdCost, locationId: suggestLocationForItem(it) });
          }}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------
 * Dialogs de Alta Rápida
 * ----------------------------------------------------------- */

function CreateSupplierDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (party: Party) => void;
}) {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Indica un nombre de proveedor.");
      return;
    }
    setSaving(true);
    try {
      const party = await createSupplier({ name: name.trim(), taxId: taxId.trim() || undefined });
      onCreated(party);
      onOpenChange(false);
      setName("");
      setTaxId("");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "No se pudo crear el proveedor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent
        title={
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nuevo proveedor
          </div>
        }
        maxWidth="28rem"
      >
        <div className="space-y-3">
          <label className="grid gap-1.5">
            <span className="text-sm">Nombre</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Productos del Valle, S.L." />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm">CIF/NIF (opcional)</span>
            <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Ej: B12345678" />
          </label>
          <div className="flex justify-end pt-2">
            <SBButton onClick={save} disabled={saving || !name.trim()}>
              {saving ? "Creando…" : "Crear"}
            </SBButton>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}

function CreateItemDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (item: Item) => void;
}) {
  const { data } = useData();
  const cats = (data?.items.map(i => i.category) || []) as ItemCategory[];
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [uom, setUom] = useState<Uom>("unit" as Uom);
  const [categoryId, setCategoryId] = useState<string>(cats[0] ?? "");
  const [stdCost, setStdCost] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Nombre del SKU requerido.");
      return;
    }
    setSaving(true);
    try {
      const item = await createItem({
        name: name.trim(),
        sku: sku.trim() || undefined,
        uom,
        categoryId: categoryId || undefined,
        stdCost: isFinite(stdCost) ? stdCost : 0,
      });
      onCreated(item);
      onOpenChange(false);
      setName("");
      setSku("");
      setStdCost(0);
      setUom("unit" as Uom);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "No se pudo crear el SKU.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent
        title={
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Nuevo SKU
          </div>
        }
        maxWidth="34rem"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="grid gap-1.5 md:col-span-2">
            <span className="text-sm">Nombre</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Tequila Blanco 20L" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm">SKU (opcional)</span>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ej: ITEM-TEQ-20L" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm">UdM</span>
            <Select value={uom} onChange={(e) => setUom(e.target.value as Uom)}>
              <option value="unit">unit</option>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="g">g</option>
              <option value="mL">mL</option>
            </Select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm">Categoría</span>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm">Coste estándar</span>
            <Input type="number" min={0} step="any" value={stdCost} onChange={(e) => setStdCost(Number(e.target.value) || 0)} />
          </label>
        </div>

        <div className="flex justify-end pt-3">
          <SBButton onClick={save} disabled={saving || !name.trim()}>
            {saving ? "Creando…" : "Crear"}
          </SBButton>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
