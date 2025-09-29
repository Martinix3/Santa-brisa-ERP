
// src/features/orders/components/OrdersTable.tsx
import React from 'react';
import type { OrderStatus } from '@/domain/ssot';

interface UiOrder {
  id: string;
  client: string;
  date: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  total: string;
  channel?: "DIRECT" | "PLACEMENT" | "OTHER";
}

interface StatusBadgeProps {
    status: UiOrder['status'];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusStyles = {
        delivered: { text: 'Entregado', classes: 'bg-green-100 text-green-800' },
        shipped: { text: 'Enviado', classes: 'bg-blue-100 text-blue-800' },
        pending: { text: 'Pendiente', classes: 'bg-amber-100 text-amber-800' },
        cancelled: { text: 'Cancelado', classes: 'bg-red-100 text-red-800' },
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
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
                            <tr key={order.id} className="bg-white border-b last:border-b-0 border-slate-200 hover:bg-slate-50">
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
        </div>
    );
}

    