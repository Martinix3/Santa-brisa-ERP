
// src/app/(app)/orders/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useData } from "@/lib/dataprovider";
import OrdersTable from "@/features/orders/components/OrdersTable";
import NewOrderModal from "@/features/orders/components/NewOrderModal";
import { Plus, Download, Filter, Search, X } from "lucide-react";
import { toast } from "sonner";
// Si ya existe, reutiliza; si no, adapta a tu entorno
import { placeOrder } from "@/app/(app)/orders/actions";

// ==============================
// Tipos locales de la vista
// ==============================

type OrderStatusUI = "pending" | "shipped" | "delivered" | "cancelled";

type UiOrder = {
  id: string;
  client: string;
  date: string; // yyyy-mm-dd
  status: OrderStatusUI;
  total: string; // € formateado
  channel?: "DIRECT" | "PLACEMENT" | "OTHER";
};

type StatusFilter = "ALL" | "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type ChannelFilter = "ALL" | "DIRECT" | "PLACEMENT" | "OTHER";

// ==============================
// Utilidades
// ==============================

function formatCurrencyEUR(v: number) {
  return v.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function normalizeStatus(raw: any): OrderStatusUI {
  // Mapea estados SSOT → UI
  const s = String(raw || "").toUpperCase();
  if (["DRAFT", "OPEN", "CONFIRMED"].includes(s)) return "pending";
  if (["PROCESSING", "PICKING", "READY_TO_SHIP", "PARTIALLY_SHIPPED"].includes(s)) return "shipped"; // visualizamos como en curso
  if (["FULFILLED", "DELIVERED", "PAID"].includes(s)) return "delivered";
  if (["CANCELLED", "VOID", "LOST"].includes(s)) return "cancelled";
  return "pending";
}

function extractChannel(o: any): UiOrder["channel"] {
  const f = (o.flow || o.channel || "").toUpperCase();
  if (f.includes("DIRECT")) return "DIRECT";
  if (f.includes("PLACEMENT") || f.includes("COLOC")) return "PLACEMENT";
  return "OTHER";
}

function toUiOrders(orders: any[], accounts: any[]): UiOrder[] {
  const accById = new Map(accounts.map((a: any) => [a.id, a]));
  return (orders || []).map((o: any) => {
    const acc = accById.get(o.accountId);
    const clientName = acc?.name || o.accountName || o.clientName || "—";
    const date = (o.date || o.createdAt || new Date().toISOString()).slice(0, 10);
    const total = formatCurrencyEUR(
      o.totalAmount ?? (o.items || o.lines || []).reduce((s: number, l: any) => s + (Number(l.unitPrice || l.priceUnit || 0) * Number(l.qty || l.quantity || 0)), 0)
    );
    return {
      id: o.id,
      client: clientName,
      date,
      status: normalizeStatus(o.status),
      total,
      channel: extractChannel(o),
    } as UiOrder;
  });
}

function exportCSV(rows: UiOrder[]) {
  const header = ["ID Pedido", "Cliente", "Fecha", "Estado", "Total", "Canal"]; 
  const csv = [header.join(",")]
    .concat(
      rows.map(r => [r.id, r.client, r.date, r.status, r.total.replaceAll(".", "").replace(" €", ""), r.channel || ""].map(v => `"${String(v).replaceAll('"', '""')}"`).join(","))
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==============================
// Página
// ==============================

export default function OrdersPage() {
  const { data } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [channel, setChannel] = useState<ChannelFilter>("DIRECT"); // Forzado a Venta Directa
  const [isModalOpen, setIsModalOpen] = useState(false);

  const uiOrders = useMemo(() => toUiOrders(data?.ordersSellOut || [], data?.accounts || []), [data?.ordersSellOut, data?.accounts]);

  const filtered = useMemo(() => {
    return uiOrders.filter(o => {
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || o.id.toLowerCase().includes(q) || o.client.toLowerCase().includes(q);
      const s = o.status.toUpperCase() as any;
      const matchesStatus = status === "ALL" || (status === 'PENDING' && (s==='PENDING' || s==='OPEN')) || (status === 'SHIPPED' && (s==='SHIPPED')) || (status === 'DELIVERED' && (s==='DELIVERED' || s==='PAID')) || s === status;
      const matchesChannel = channel === "ALL" || (o.channel || "OTHER") === channel;
      return matchesQuery && matchesStatus && matchesChannel;
    });
  }, [uiOrders, query, status, channel]);

  // === KPIs (contenedores grises, sin sombra)
  const kpis = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter(o => o.status === "pending").length;
    const toShip = filtered.filter(o => o.status === "shipped").length;
    const delivered = filtered.filter(o => o.status === "delivered").length;
    const cancelled = filtered.filter(o => o.status === "cancelled").length;
    const amount = (data?.ordersSellOut || []).filter(o => extractChannel(o) === 'DIRECT').reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
    return { total, pending, toShip, delivered, cancelled, amount: formatCurrencyEUR(amount) };
  }, [filtered, data?.ordersSellOut]);

  // === Crear pedido
  const handleCreateOrder = (payload: any) => {
    placeOrder({ ...payload, createdById: "u_admin" })
      .then(() => toast.success("Pedido creado con éxito"))
      .catch((e: any) => toast.error(e?.message || "Error al crear"));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Pedidos de Venta Directa</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(filtered)} className="inline-flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm shadow-sm bg-white hover:bg-slate-50">
            <Download size={16}/> Exportar
          </button>
          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm shadow-sm" style={{ backgroundColor: "#F4C542", color: "#111827" }}>
            <Plus size={16}/> Nuevo pedido
          </button>
        </div>
      </div>

      {/* KPIs — contenedores grises, sin sombra */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: kpis.total },
          { label: "Pendientes", value: kpis.pending },
          { label: "En curso", value: kpis.toShip },
          { label: "Entregados", value: kpis.delivered },
          { label: "Cancelados", value: kpis.cancelled },
          { label: "Importe total", value: kpis.amount },
        ].map((k) => (
          <div key={k.label} className="bg-[#f9fafb] border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className="text-xl font-semibold text-slate-900">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ID o cliente…"
              className="w-full pl-10 pr-8 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            {query && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setQuery("")}> <X size={16}/></button>
            )}
          </div>
          <div className="flex gap-2">
            <select value={status} onChange={(e)=>setStatus(e.target.value as StatusFilter)} className="py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option value="ALL">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="SHIPPED">En curso</option>
              <option value="DELIVERED">Entregados</option>
              <option value="CANCELLED">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <OrdersTable orders={filtered} />

      {/* Modal crear pedido */}
      <NewOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
}

    