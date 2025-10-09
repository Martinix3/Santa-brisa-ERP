// src/features/orders/components/OrdersTable.tsx
import React, { useState } from 'react';
import type { OrderStatus } from '@/domain/ssot.v7';
import { SBCard } from '@/components/ui/ui-primitives';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface UiOrder {
  id: string;
  client: string;
  date: string;
  status: OrderStatus;
  total: string;
  channel?: "DIRECT" | "PLACEMENT" | "OTHER";
}

interface StatusBadgeProps {
    status: UiOrder['status'];
    orderId: string;
    onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, orderId, onStatusChange }) => {
    const statusStyles: Record<OrderStatus, { text: string; classes: string }> = {
        open: { text: 'Abierto', classes: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
        confirmed: { text: 'Confirmado', classes: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' },
        shipped: { text: 'Enviado', classes: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200' },
        invoiced: { text: 'Facturado', classes: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
        paid: { text: 'Pagado', classes: 'bg-green-100 text-green-800 hover:bg-green-200' },
        cancelled: { text: 'Cancelado', classes: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200' },
        lost: { text: 'Perdido', classes: 'bg-red-100 text-red-800 hover:bg-red-200' },
    };

    const allStatuses: { value: OrderStatus; label: string }[] = [
        { value: 'open', label: 'Abierto' },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'shipped', label: 'Enviado' },
        { value: 'invoiced', label: 'Facturado' },
        { value: 'paid', label: 'Pagado' },
        { value: 'cancelled', label: 'Cancelado' },
        { value: 'lost', label: 'Perdido' },
    ];

    const { text, classes } = statusStyles[status] || { text: 'Desconocido', classes: 'bg-slate-100 text-slate-800' };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button 
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${classes}`}
                >
                    {text}
                    <ChevronDown size={12} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {allStatuses.map(s => (
                    <DropdownMenuItem
                        key={s.value}
                        onClick={() => onStatusChange?.(orderId, s.value)}
                        className={status === s.value ? 'font-bold' : ''}
                    >
                        {s.label}
                        {status === s.value && ' ✓'}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default function OrdersTable({ orders, onStatusChange }: { 
    orders: UiOrder[];
    onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}) {
    const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
        if (onStatusChange) {
            onStatusChange(orderId, newStatus);
        }
    };

    return (
        <SBCard>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-semibold">ID Pedido</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Cliente</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Fecha</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Estado</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id} className="bg-card border-b last:border-b-0 border-slate-200 hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-xs text-slate-900">{order.id}</td>
                                <td className="px-6 py-4">{order.client}</td>
                                <td className="px-6 py-4">{new Date(order.date).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge 
                                        status={order.status} 
                                        orderId={order.id}
                                        onStatusChange={handleStatusChange}
                                    />
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-900 text-right">
                                    {order.total}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SBCard>
    );
}
