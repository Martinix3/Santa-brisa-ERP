// src/features/orders/components/OrdersTable.tsx
import React from 'react';
import type { OrderStatus } from '@/domain/ssot';
import { SBCard } from '@/components/ui/ui-primitives';

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
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusStyles: Record<OrderStatus, { text: string; classes: string }> = {
        open: { text: 'Abierto', classes: 'bg-blue-100 text-blue-800' },
        confirmed: { text: 'Confirmado', classes: 'bg-indigo-100 text-indigo-800' },
        shipped: { text: 'Enviado', classes: 'bg-cyan-100 text-cyan-800' },
        invoiced: { text: 'Facturado', classes: 'bg-purple-100 text-purple-800' },
        paid: { text: 'Pagado', classes: 'bg-green-100 text-green-800' },
        cancelled: { text: 'Cancelado', classes: 'bg-zinc-100 text-zinc-800' },
        lost: { text: 'Perdido', classes: 'bg-red-100 text-red-800' },
    };

    const { text, classes } = statusStyles[status] || { text: 'Desconocido', classes: 'bg-slate-100 text-slate-800' };

    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${classes}`}>
            {text}
        </span>
    );
};

export default function OrdersTable({ orders }: { orders: UiOrder[] }) {
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
                                    <StatusBadge status={order.status} />
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
