"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { Download, Plus, Search } from 'lucide-react';
import type { OrderSellOut, Account, User, OrderStatus } from '@/domain/ssot';
import { orderTotal } from '@/domain/ssot';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

// Componente de UI para los filtros
function FilterPill({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm bg-white border border-zinc-200 rounded-md pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-yellow-300"
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

// Pill para el estado del pedido
function StatusPill({ status }: { status: OrderStatus }) {
    const statusMap: Record<OrderStatus, { label: string; className: string }> = {
        open: { label: 'Borrador', className: 'bg-zinc-100 text-zinc-700' },
        confirmed: { label: 'Confirmado', className: 'bg-blue-100 text-blue-700' },
        shipped: { label: 'Enviado', className: 'bg-cyan-100 text-cyan-700' },
        invoiced: { label: 'Facturado', className: 'bg-green-100 text-green-700' },
        cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
        lost: { label: 'Perdido', className: 'bg-neutral-200 text-neutral-600' },
    };

    const style = statusMap[status] || statusMap.open;

    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.className}`}>
            {style.label}
        </span>
    );
}

export default function OrdersDashboard() {
  const { data } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { ordersSellOut, accounts, users } = data || { ordersSellOut: [], accounts: [], users: [] };
  
  const accountMap = useMemo(() => new Map(accounts.map((acc: Account) => [acc.id, acc.name])), [accounts]);
  const userMap = useMemo(() => new Map(users.map((user: User) => [user.id, user.name])), [users]);

  const filteredOrders = useMemo(() => {
    return (ordersSellOut as OrderSellOut[])
      .filter((order) => {
        if (!order) return false;
        const matchesSearch =
          !searchTerm ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          accountMap.get(order.accountId)?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = !statusFilter || order.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ordersSellOut, searchTerm, statusFilter, accountMap]);

  return (
    <>
      <ModuleHeader title="Gestión de Pedidos" icon={ShoppingCart}>
        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-md px-3 py-1.5 hover:bg-zinc-50">
              <Download size={14} /> Exportar
            </button>
            <button className="flex items-center gap-2 text-sm bg-yellow-400 text-zinc-900 font-semibold rounded-md px-3 py-1.5 hover:bg-yellow-500">
              <Plus size={16} /> Nuevo Pedido
            </button>
        </div>
      </ModuleHeader>

      <div className="p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-grow">
                <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input 
                    type="text"
                    placeholder="Buscar por ID de pedido o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
                />
            </div>
            <FilterPill
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filtrar por estado"
                options={[
                    { value: 'open', label: 'Borrador' },
                    { value: 'confirmed', label: 'Confirmado' },
                    { value: 'shipped', label: 'Enviado' },
                    { value: 'invoiced', label: 'Facturado' },
                    { value: 'cancelled', label: 'Cancelado' },
                ]}
            />
        </div>
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="p-3 font-semibold text-zinc-600">Pedido ID</th>
                <th className="p-3 font-semibold text-zinc-600">Cliente</th>
                <th className="p-3 font-semibold text-zinc-600">Comercial</th>
                <th className="p-3 font-semibold text-zinc-600">Fecha</th>
                <th className="p-3 font-semibold text-zinc-600 text-right">Total</th>
                <th className="p-3 font-semibold text-zinc-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-50">
                  <td className="p-3 font-mono text-xs font-medium text-zinc-800">{order.id}</td>
                  <td className="p-3">
                    <Link href={`/accounts/${order.accountId}`} className="hover:underline">
                      {accountMap.get(order.accountId) || 'N/A'}
                    </Link>
                  </td>
                  <td className="p-3">{userMap.get(order.userId || '') || 'N/A'}</td>
                  <td className="p-3">{new Date(order.createdAt).toLocaleDateString('es-ES')}</td>
                  <td className="p-3 text-right font-semibold">
                    {orderTotal(order).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="p-3">
                    <StatusPill status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No se encontraron pedidos que coincidan con tu búsqueda.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
