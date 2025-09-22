
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { OrderSellOut, Account } from '@/domain/ssot';
import { ORDER_STATUS_META } from '@/domain/ssot';
import Link from 'next/link';
import { ImportShopifyOrderButton } from '@/features/orders/components/ImportShopifyOrderButton';

type Tab = 'directa' | 'colocacion' | 'online';

function KpiCard({ title, value }: { title:string; value:number }) {
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-zinc-600">{title}</div>
    </div>
  );
}

export default function OrdersDashboard() {
  const { data } = useData() as {
    data: { ordersSellOut: OrderSellOut[]; accounts: Account[] } | null
  };

  const [tab, setTab] = useState<Tab>('directa');
  
  const accountsById = useMemo(() => {
    const m = new Map<string, Account>();
    (data?.accounts || []).forEach(a => m.set(a.id, a));
    return m;
  }, [data]);

  const allOrders = (data?.ordersSellOut || []).sort((a,b)=> (a.createdAt > b.createdAt ? -1 : 1));

  const filtered = useMemo(() => {
    if (tab === 'online') {
      // Dos criterios SSOT válidos para “Online”: source = SHOPIFY o account.type = ONLINE
      return allOrders.filter(o =>
        o.source === 'SHOPIFY' || accountsById.get(o.accountId)?.type === 'ONLINE'
      );
    }
    if (tab === 'colocacion') {
      // Si tienes una marca de consignación propia, filtra aquí.
      // Placeholder: deja solo no-online y no-cancelados.
      return allOrders.filter(o => accountsById.get(o.accountId)?.type !== 'ONLINE');
    }
    // directa: el resto (no online). Ajusta si manejas “consignación” explícita.
    return allOrders.filter(o => accountsById.get(o.accountId)?.type !== 'ONLINE');
  }, [allOrders, tab, accountsById]);

  // KPIs del tablero (mismo formato por pestaña)
  const kpi = useMemo(() => {
    const k = { toConfirm: 0, toShip: 0, consignmentUnits: 0, toInvoice: 0, toCollect: 0, total: 0 };
    for (const o of filtered) {
      k.total++;
      if (o.status === 'open') k.toConfirm++;
      if (o.status === 'confirmed') k.toShip++;
      if (o.status === 'invoiced') k.toCollect++; // o.toInvoice según tu política
    }
    return k;
  }, [filtered]);

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {(['directa','colocacion','online'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full border text-sm ${
              tab===t ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            {t === 'directa' ? 'Venta Directa' : t === 'colocacion' ? 'Colocación (Sell-Out)' : 'Online'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {tab === 'online' && <ImportShopifyOrderButton />}
          <Link href="/orders/new" className="px-3 py-2 text-sm rounded-md bg-black text-white">
            Nuevo pedido
          </Link>
        </div>
      </div>

      {/* KPIs (mismo formato/estilos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard title="Pendiente de Confirmar" value={kpi.toConfirm} />
        <KpiCard title="Pendiente de Enviar" value={kpi.toShip} />
        <KpiCard title="Unidades en Consigna" value={kpi.consignmentUnits} />
        <KpiCard title="Pendiente de Facturar" value={kpi.toInvoice} />
        <KpiCard title="Pendiente de Cobrar" value={kpi.toCollect} />
      </div>

      {/* Tabla — mismo layout + columna Fuente (SSOT: order.source) */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr className="text-left">
              <th className="p-3">Pedido ID</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Importe</th>
              <th className="p-3">Fuente</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const acc = accountsById.get(o.accountId);
              const meta = ORDER_STATUS_META[o.status];
              return (
                <tr key={o.id} className="border-t">
                  <td className="p-3">
                    <Link href={`/orders/${o.id}`} className="underline">
                      {o.docNumber || o.id}
                    </Link>
                  </td>
                  <td className="p-3">{acc?.name || o.accountId}</td>
                  <td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{(o.totalAmount ?? 0).toFixed(2)} {o.currency}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border">
                      {o.source || 'CRM'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-white"
                          style={{ background: meta.accent }}>
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td className="p-6 text-zinc-500" colSpan={6}>
                No hay pedidos en esta pestaña. {tab === 'online' ? 'Importa uno desde Shopify para empezar.' : ''}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
