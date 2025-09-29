
import React from 'react';
import { Search } from 'lucide-react';

type OrderStatus = 'delivered' | 'shipped' | 'pending' | 'cancelled';

interface Order {
    id: string;
    client: string;
    date: string;
    status: OrderStatus;
    total: string;
}

interface StatusBadgeProps {
    status: OrderStatus;
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


export default function OrdersTable({ orders }: { orders: Order[] }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            {/* Filtros */}
            <div className="flex items-center space-x-4 mb-5">
                <div className="flex-1 relative">
                    <input 
                        type="search" 
                        placeholder="Buscar por ID de pedido, cliente..." 
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                <select className="py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>Todos los estados</option>
                    <option>Pendiente</option>
                    <option>Enviado</option>
                    <option>Entregado</option>
                    <option>Cancelado</option>
                </select>
            </div>

            {/* Tabla */}
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
                                <td className="px-6 py-4 font-medium text-slate-900">{order.id}</td>
                                <td className="px-6 py-4">{order.client}</td>
                                <td className="px-6 py-4">{order.date}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={order.status} />
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-900 text-right">{order.total}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
