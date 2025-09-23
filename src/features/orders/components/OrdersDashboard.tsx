

"use client";

import React, { useMemo, useState, useTransition } from "react";
import type { OrderStatus, Account, OrderSellOut, Party, PartyRole, CustomerData, User, Shipment, SantaData } from '@/domain';
import { ORDER_STATUS_STYLES, SBButton } from '@/components/ui/ui-primitives';
import { useData } from "@/lib/dataprovider";
import { updateOrderStatus } from "@/app/(app)/orders/actions";
import { ImportShopifyOrderButton } from './ImportShopifyOrderButton';
import Link from "next/link";
import { orderTotal } from "@/lib/sb-core";
import { consignmentOnHandByAccount, consignmentTotalUnits } from '@/lib/consignment-and-samples';
import { AlertCircle, Truck, Boxes, FileText, CreditCard } from 'lucide-react';


type Tab = "directa" | "colocacion" | "online";

function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "directa", label: "Venta Directa" },
    { id: "colocacion", label: "Colocación (Sell-Out)" },
    { id: "online", label: "Online" },
  ];
  return (
    <div className="border-b border-zinc-200">
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              active === t.id
                ? "border-yellow-500 text-yellow-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            }`}
            aria-current={active === t.id ? "page" : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

const STATUS_OPTS: { value: OrderStatus; label: string }[] = [
  { value: "open", label: "Borrador" },
  { value: "confirmed", label: "Confirmado" },
  { value: "shipped", label: "Enviado" },
  { value: "invoiced", label: "Facturado" },
  { value: "paid", label: "Pagado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "lost", label: "Perdido" },
];

function FilterPill({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm bg-white border border-zinc-200 rounded-md pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-yellow-300"
      aria-label={placeholder}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-start gap-4">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
        <p className="text-sm text-zinc-600">{label}</p>
      </div>
    </div>
  );
}


function StatusSelector({ order, onChange, accountsById, partiesById }: { 
  order: OrderSellOut; 
  onChange: (o: OrderSellOut, s: OrderStatus) => Promise<void>;
  accountsById: Map<string, Account>;
  partiesById: Map<string, Party>;
}) {
  const [isPending, start] = useTransition();
  const status = order.status || 'open';
  const style = ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.open;

  return (
    <div className="relative flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => start(() => {
          const account = accountsById.get(order.accountId);
          const party = account ? partiesById.get(account.partyId) : undefined;
          if (account && party) {
            onChange(order, e.target.value as OrderStatus)
          }
        })}
        disabled={isPending}
        className={`appearance-none px-2.5 py-1 text-xs font-semibold rounded-full outline-none focus:ring-2 ring-offset-1 ring-blue-400 transition-colors ${style.bg} ${style.color}`}
      >
        {STATUS_OPTS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isPending && <span className="h-4 w-4 animate-spin border-2 border-zinc-400 border-t-transparent rounded-full" />}
    </div>
  );
}

function exportToCsv(filename: string, rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => row.map((val) => `"${String(val).replace(/\"/g, '""')}"`).join(",");
  const blob = new Blob([rows.map(processRow).join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export default function OrdersDashboard() {
  const { data, setData } = useData();

  const [tab, setTab] = useState<Tab>("directa");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [isCreateOpen, setCreateOpen] = useState(false);

  const { ordersSellOut = [], accounts = [], users = [], partyRoles = [], stockMoves = [], shipments = [], parties = [] } = data || ({} as SantaData);

  const consByAcc = useMemo(() => consignmentOnHandByAccount(stockMoves || []), [stockMoves]);
  const consTotals = useMemo(() => consignmentTotalUnits(consByAcc), [consByAcc]);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const partiesById = useMemo(() => new Map(parties.map((p) => [p.id, p])), [parties]);
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const rolesByPartyId = useMemo(() => {
    const m = new Map<string, CustomerData>();
    (partyRoles || []).forEach((r: PartyRole) => {
      if (r.role === "CUSTOMER") m.set(r.partyId, r.data as CustomerData);
    });
    return m;
  }, [partyRoles]);

  const visibleOrders = useMemo(() => {
    const isOnlineAcc = (acc?: Account) => acc?.type === "ONLINE";

    return (ordersSellOut || [])
      .filter((o) => {
        const acc = accountsById.get(o.accountId);
        if (!acc) return false;

        const customerRole = rolesByPartyId.get(acc.partyId);
        const billerId = customerRole?.billerId || "SB";
        const isDirecta = billerId === "SB";

        if (tab === "online") {
          if (!(o.source === "SHOPIFY" || isOnlineAcc(acc))) return false;
        } else if (tab === "directa") {
          if (!isDirecta || isOnlineAcc(acc)) return false;
        } else if (tab === "colocacion") {
          if (isDirecta || isOnlineAcc(acc)) return false;
        }

        const sOk = !status || o.status === (status as OrderStatus);
        const qOk =
          !q ||
          (o.docNumber && o.docNumber.toLowerCase().includes(q.toLowerCase())) ||
          o.id.toLowerCase().includes(q.toLowerCase()) ||
          (acc?.name || "").toLowerCase().includes(q.toLowerCase());
        return sOk && qOk;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ordersSellOut, accountsById, rolesByPartyId, q, status, tab]);

  const kpi = useMemo(() => {
    const k = { toConfirm: 0, toShip: 0, toInvoice: 0, toCollect: 0, consignmentUnits: 0 };
    for (const o of visibleOrders) {
      if (o.status === "open") k.toConfirm++;
      if (o.status === "confirmed") k.toShip++;
      if (o.status === "shipped") k.toInvoice++;
      if (o.status === "invoiced") k.toCollect++;
    }
    k.consignmentUnits = Object.values(consTotals).reduce((a, b) => a + b, 0);
    return k;
  }, [visibleOrders, consTotals]);

  const onExport = () => {
    const headers = ["id", "fecha", "cliente", "total", "estado", "fuente"];
    const rows = visibleOrders.map((o) => {
      const acc = accountsById.get(o.accountId);
      return [o.docNumber || o.id, new Date(o.createdAt).toISOString().split("T")[0], acc?.name || o.accountId, orderTotal(o), o.status, o.source || "CRM"];
    });
    exportToCsv(`pedidos-${tab}-${new Date().toISOString().split("T")[0]}.csv`, [headers, ...rows]);
  };
  
  const onStatusChange = async (o: OrderSellOut, s: OrderStatus) => {
    const acc = accountsById.get(o.accountId);
    const party = acc ? partiesById.get(acc.partyId) : undefined;
    if (!acc || !party) return;
    try {
      const res = await updateOrderStatus(o, acc, party, s);
      if (res?.ok && data) {
        const orders = data.ordersSellOut.map((x) => (x.id === res.order.id ? { ...x, status: res.order.status } : x));
        const ships = res.shipment ? [...(data.shipments || []), res.shipment] : data.shipments;
        setData({ ...data, ordersSellOut: orders, shipments: ships as Shipment[] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Tabs active={tab} onChange={setTab} />
            <div className="flex items-center gap-2">
                {tab === 'online' && <ImportShopifyOrderButton />}
                <SBButton as={Link} href="/orders/new">
                    Nuevo pedido
                </SBButton>
                 <SBButton variant="secondary" onClick={onExport} aria-label="Exportar a CSV">
                    Exportar
                </SBButton>
            </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={AlertCircle} label="Pendiente de Confirmar" value={kpi.toConfirm} color="#f59e0b" />
        <KpiCard icon={Truck} label="Pendiente de Enviar" value={kpi.toShip} color="#3b82f6" />
        <KpiCard icon={Boxes} label="Unidades en Consigna" value={kpi.consignmentUnits} color="#a855f7" />
        <KpiCard icon={FileText} label="Pendiente de Facturar" value={kpi.toInvoice} color="#10b981" />
        <KpiCard icon={CreditCard} label="Pendiente de Cobrar" value={kpi.toCollect} color="#8b5cf6" />
      </div>

       <div className="mt-4 mb-4 flex items-center gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Buscar por ID de pedido o cliente..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
              aria-label="Buscar pedidos"
            />
          </div>
          <FilterPill value={status} onChange={setStatus} placeholder="Filtrar por estado" options={STATUS_OPTS} />
        </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="p-3 font-semibold text-zinc-600">Pedido ID</th>
              <th className="p-3 font-semibold text-zinc-600">Cliente</th>
              <th className="p-3 font-semibold text-zinc-600">Comercial</th>
              <th className="p-3 font-semibold text-zinc-600">Fecha</th>
              <th className="p-3 font-semibold text-zinc-600">Fuente</th>
              <th className="p-3 font-semibold text-zinc-600 text-right">Total</th>
              <th className="p-3 font-semibold text-zinc-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visibleOrders.map((o) => {
              const acc = accountsById.get(o.accountId);
              if (!acc) return null;
              const owner = usersById.get(acc.ownerId);
              const total = orderTotal(o);
              const status = o.status || 'open';
              const meta = ORDER_STATUS_STYLES[status];

              return (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="p-3 font-mono text-xs font-medium text-zinc-800">
                    <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline" title={o.id}>
                      {o.docNumber || o.id}
                    </Link>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/accounts/${acc.id}`} className="hover:underline font-medium" title={o.accountId}>
                        {acc?.name || "N/A"}
                      </Link>
                    </div>
                  </td>
                  <td className="p-3">{owner?.name || "N/A"}</td>
                  <td className="p-3">{new Date(o.createdAt).toLocaleDateString("es-ES")}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-zinc-100 text-zinc-800">
                      {o.source || "CRM"}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold">{total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                  <td className="p-3">
                    <StatusSelector order={o} onChange={onStatusChange} accountsById={accountsById} partiesById={partiesById}/>
                  </td>
                </tr>
              );
            })}
            {visibleOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  No se encontraron pedidos en esta vista.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
