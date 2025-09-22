
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { OrderSellOut, Account } from '@/domain/ssot';
import { ORDER_STATUS_META } from '@/domain/ssot';
import Link from 'next/link';
import { ImportShopifyOrderButton } from '@/features/orders/components/ImportShopifyOrderButton';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';

type Tab = 'directa' | 'colocacion' | 'online';

function KpiCard({ title, value }: { title:string; value:number }) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
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
      return allOrders.filter(o =>
        o.source === 'SHOPIFY' || accountsById.get(o.accountId)?.type === 'ONLINE'
      );
    }
    if (tab === 'colocacion') {
      return allOrders.filter(o => accountsById.get(o.accountId)?.type !== 'ONLINE');
    }
    return allOrders.filter(o => accountsById.get(o.accountId)?.type !== 'ONLINE');
  }, [allOrders, tab, accountsById]);

  const kpi = useMemo(() => {
    const k = { toConfirm: 0, toShip: 0, consignmentUnits: 0, toInvoice: 0, toCollect: 0, total: 0 };
    for (const o of filtered) {
      k.total++;
      if (o.status === 'open') k.toConfirm++;
      if (o.status === 'confirmed') k.toShip++;
      if (o.status === 'invoiced') k.toCollect++;
    }
    return k;
  }, [filtered]);

  return (
    <>
      <ModuleHeader title="Pedidos" icon={ShoppingCart} />
      <div className="p-6 bg-zinc-50 flex-grow">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['directa','colocacion','online'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    tab===t ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {t === 'directa' ? 'Venta Directa' : t === 'colocacion' ? 'Colocación (Sell-Out)' : 'Online'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {tab === 'online' && <ImportShopifyOrderButton />}
              <Link href="/orders/new" className="px-3 py-2 text-sm rounded-md bg-zinc-900 text-white font-semibold hover:bg-zinc-800">
                Nuevo pedido
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard title="Pendiente de Confirmar" value={kpi.toConfirm} />
            <KpiCard title="Pendiente de Enviar" value={kpi.toShip} />
            <KpiCard title="Unidades en Consigna" value={kpi.consignmentUnits} />
            <KpiCard title="Pendiente de Facturar" value={kpi.toInvoice} />
            <KpiCard title="Pendiente de Cobrar" value={kpi.toCollect} />
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left">
                  <th className="p-3 font-medium text-zinc-600">Pedido ID</th>
                  <th className="p-3 font-medium text-zinc-600">Cliente</th>
                  <th className="p-3 font-medium text-zinc-600">Fecha</th>
                  <th className="p-3 font-medium text-zinc-600">Importe</th>
                  <th className="p-3 font-medium text-zinc-600">Fuente</th>
                  <th className="p-3 font-medium text-zinc-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(o => {
                  const acc = accountsById.get(o.accountId);
                  const meta = ORDER_STATUS_META[o.status];
                  return (
                    <tr key={o.id} className="hover:bg-zinc-50">
                      <td className="p-3 font-mono text-xs">
                        <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                          {o.docNumber || o.id}
                        </Link>
                      </td>
                      <td className="p-3">{acc?.name || o.accountId}</td>
                      <td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{(o.totalAmount ?? 0).toFixed(2)} {o.currency}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border bg-white text-xs">
                          {o.source || 'CRM'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-6 text-zinc-500 text-center" colSpan={6}>
                      No hay pedidos en esta pestaña. {tab === 'online' ? 'Importa uno desde Shopify para empezar.' : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
