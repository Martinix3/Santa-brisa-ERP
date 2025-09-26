"use client";
import React, { useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { SBCard, Input, Select, DataTableSB } from "@/components/ui/ui-primitives";
import type { OnHandView, Item, ItemCategory } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import { rebuildOnHand } from "./actions";

// -------------------- Helpers --------------------
type Col<T> = {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
};

function toCsv(rows: Record<string, any>[], headers: string[]) {
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.join(",");
  const body = rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n");
  return `${head}\n${body}`;
}

function download(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// -------------------- Página --------------------
export default function InventoryPage() {
  const { data: santaData } = useData();
  const [activeTab, setActiveTab] = useState<ItemCategory>("fg");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [showZeros, setShowZeros] = useState(false);

  // Catálogo por id (para nombre y SKU)
  const itemsById = useMemo(() => {
    const map = new Map<string, Item>();
    (santaData?.items || []).forEach(it => map.set(it.id, it));
    return map;
  }, [santaData?.items]);

  // Vista onHand ordenada por fecha desc
  const onHandAll: OnHandView[] = useMemo(() => {
    const src = santaData?.onHand || [];
    const sorted = [...src].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sorted;
  }, [santaData?.onHand]);

  useEffect(() => {
    // loading se apaga en cuanto llega onHand (aunque esté vacío)
    if (santaData) setLoading(false);
  }, [santaData]);

  // Lista de ubicaciones disponibles (para filtro)
  const locations = useMemo(() => {
    const set = new Set<string>();
    onHandAll.forEach((oh) => {
      if (oh.locationId) set.add(oh.locationId);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [onHandAll]);

  // Filtro por pestaña (categoría)
  const filteredByCategory = useMemo(() => {
    return onHandAll.filter((oh) => {
      const item = itemsById.get(oh.itemId);
      if (!item) return false;
      if (activeTab === "pack") {
        return item.category === "pack" || item.category === "label";
      }
      return item.category === activeTab;
    });
  }, [onHandAll, itemsById, activeTab]);

  // Filtros: búsqueda + ubicación + qty>0 opcional
  const filteredInventory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filteredByCategory.filter((oh) => {
      const item = itemsById.get(oh.itemId);
      if (!item) return false;

      // Filtro ubicación
      if (locationFilter !== "ALL") {
        if ((oh.locationId || "") !== locationFilter) return false;
      }
      // Filtro qty
      if (!showZeros && !(oh.qty > 0)) return false;

      // Filtro búsqueda (SKU/nombre/lote)
      if (!q) return true;
      const haystack = [
        item.name || "",
        item.sku || "",
        oh.lotNumber || "",
        oh.locationId || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [filteredByCategory, itemsById, locationFilter, showZeros, query]);

  // Resumen (cantidad total)
  const totalQty = useMemo(
    () => filteredInventory.reduce((acc, r) => acc + (Number(r.qty) || 0), 0),
    [filteredInventory]
  );

  const cols: Col<OnHandView>[] = [
    {
      key: "lotNumber",
      header: "Lote",
      render: (r) => (
        <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded-md">
          {r.lotNumber || r.id.substring(0, 12)}
        </span>
      ),
    },
    {
      key: "itemId",
      header: "Producto (SKU)",
      render: (r) => {
        const item = itemsById.get(r.itemId);
        return (
          <div>
            <span className="font-medium text-zinc-800">
              {item?.name || r.itemId}
            </span>
            <p className="text-xs text-zinc-500">{item?.sku}</p>
          </div>
        );
      },
    },
    {
      key: "qty",
      header: "Cantidad",
      className: "text-right",
      render: (r) => (
        <span className="font-semibold">
          {r.qty}{" "}
          <span className="text-xs font-normal text-zinc-500">{r.uom}</span>
        </span>
      ),
    },
    {
      key: "locationId",
      header: "Ubicación",
      render: (r) => r.locationId || "—",
    },
    {
      key: "updatedAt",
      header: "Fecha",
      render: (r) =>
        r.updatedAt
          ? new Date(r.updatedAt).toLocaleDateString("es-ES")
          : "—",
    },
  ];

  const TABS: { id: ItemCategory; label: string }[] = [
    { id: "fg", label: "Producto Terminado" },
    { id: "raw", label: "Materias Primas" },
    { id: "intermediate", label: "Intermedios" },
    { id: "pack", label: "Packaging y Etiquetas" },
    { id: "merch", label: "Merchandising" },
    { id: "consumable", label: "Consumibles" },
  ];

  const exportCsv = () => {
    const headers = [
      "itemId",
      "sku",
      "name",
      "lotNumber",
      "qty",
      "uom",
      "locationId",
      "updatedAt",
      "id",
    ];
    const rows = filteredInventory.map((r) => {
      const it = itemsById.get(r.itemId);
      return {
        itemId: r.itemId,
        sku: it?.sku || "",
        name: it?.name || "",
        lotNumber: r.lotNumber || "",
        qty: r.qty,
        uom: r.uom,
        locationId: r.locationId || "",
        updatedAt: r.updatedAt || "",
        id: r.id,
      };
    });
    const csv = toCsv(rows, headers);
    download(
      `inventory_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv
    );
  };

  // ---------- UI ----------
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800">Inventario</h1>
          <p className="text-xs text-zinc-500">
            {filteredInventory.length} líneas · total {totalQty} unidades
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-600">Ubicación</label>
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc === "ALL" ? "Todas" : loc}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-600">Mostrar 0</label>
            <input
              type="checkbox"
              checked={showZeros}
              onChange={(e) => setShowZeros(e.target.checked)}
              className="h-4 w-4"
            />
          </div>

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por SKU, nombre, lote o ubicación…"
          />
          <button
            onClick={() =>
              startTransition(async () => {
                await rebuildOnHand();
              })
            }
            className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-md px-3 py-1.5 hover:bg-zinc-50"
            disabled={pending}
          >
            {pending ? "Recalculando…" : "Recalcular on-hand"}
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-md px-3 py-1.5 hover:bg-zinc-50"
          >
            <Download size={14} /> Exportar
          </button>
          <Link
            href="/warehouse/goods-receipt"
            className="flex items-center gap-2 text-sm bg-cyan-600 text-white rounded-md px-3 py-1.5 hover:bg-cyan-700"
          >
            <Plus size={14} /> Añadir Entrada
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex flex-wrap gap-4" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <SBCard title="">
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Cargando inventario…</div>
        ) : santaData?.onHand === undefined ? (
          <div className="p-6 text-sm text-zinc-600">
            No existe la vista de inventario todavía.
            <button
              onClick={() =>
                startTransition(async () => {
                  await rebuildOnHand();
                })
              }
              className="ml-2 underline text-cyan-700"
              disabled={pending}
            >
              {pending ? "Creando…" : "Crear ahora"}
            </button>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No hay resultados para los filtros actuales.
          </div>
        ) : (
          <DataTableSB rows={filteredInventory} cols={cols as any} />
        )}
      </SBCard>
    </div>
  );
}
