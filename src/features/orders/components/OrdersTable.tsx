// src/features/orders/components/OrdersTable.tsx
import React from 'react';
import { Search } from 'lucide-react';
import type { OrderSellOut as Order } from '@/domain/ssot';

type OrderStatus = 'delivered' | 'shipped' | 'pending' | 'cancelled' | 'open' | 'confirmed' | 'invoiced' | 'paid' | 'lost';

interface StatusBadgeProps {
    status: OrderStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusStyles = {
        delivered: { text: 'Entregado', classes: 'bg-green-100 text-green-800' },
        shipped: { text: 'Enviado', classes: 'bg-blue-100 text-blue-800' },
        pending: { text: 'Pendiente', classes: 'bg-amber-100 text-amber-800' },
        cancelled: { text: 'Cancelado', classes: 'bg-red-100 text-red-800' },
        open: { text: 'Abierto', classes: 'bg-slate-100 text-slate-800' },
        confirmed: { text: 'Confirmado', classes: 'bg-indigo-100 text-indigo-800' },
        invoiced: { text: 'Facturado', classes: 'bg-purple-100 text-purple-800' },
        paid: { text: 'Pagado', classes: 'bg-emerald-100 text-emerald-800' },
        lost: { text: 'Perdido', classes: 'bg-rose-100 text-rose-800' },
    };

    const { text, classes } = statusStyles[status] || { text: 'Desconocido', classes: 'bg-slate-100 text-slate-800' };

    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${classes}`}>
            {text}
        </span>
    );
};


export default function OrdersTable({ orders }: { orders: Order[] }) {
    return (
        <div>
            <div className="flex items-center space-x-4 mb-5">
                <div className="flex-1 relative">
                    <input 
                        type="search" 
                        placeholder="Buscar por ID de pedido, cliente..." 
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C542]"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                <select className="py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C542]">
                    <option>Todos los estados</option>
                    <option>Pendiente</option>
                    <option>Enviado</option>
                    <option>Entregado</option>
                    <option>Cancelado</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-semibold rounded-l-lg">ID Pedido</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Cliente</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Fecha</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Estado</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-right rounded-r-lg">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id} className="bg-white border-b last:border-b-0 border-slate-200 hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-xs text-slate-900">{order.docNumber || order.id}</td>
                                <td className="px-6 py-4">Cliente Ficticio</td>
                                <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={order.status as OrderStatus} />
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-900 text-right">
                                    {order.totalAmount?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
