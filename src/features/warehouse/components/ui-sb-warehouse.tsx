
"use client";
import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, DataTableSB, Col, Button, SB_COLORS } from '@/components/ui/ui-primitives';
import { Warehouse, Truck, Package, DollarSign } from 'lucide-react';
import type { InventoryItem, Shipment, OrderStatus } from '@/domain/ssot';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function StatusPill({status}:{status: Shipment['status']}){
  const map: Record<Shipment['status'], { txt:string, bg:string }> = {
    pending: { txt: "Pendiente", bg: "bg-yellow-100 text-yellow-800" },
    picking: { txt: "En picking", bg: "bg-blue-100 text-blue-800" },
    ready_to_ship: { txt: "Listo", bg: "bg-purple-100 text-purple-800" },
    shipped: { txt: "Enviado", bg: "bg-cyan-100 text-cyan-800" },
    delivered: { txt: "Entregado", bg: "bg-green-100 text-green-800" },
    cancelled: { txt: "Cancelado", bg: "bg-red-100 text-red-800" },
  };
  const s = map[status] || map.pending;
  return <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${s.bg}`}>{s.txt}</span>;
}


export function WarehouseNav() {
    const pathname = usePathname();
    const navItems = [
        { href: '/warehouse/dashboard', label: 'Dashboard' },
        { href: '/warehouse/inventory', label: 'Inventario' },
        { href: '/warehouse/logistics', label: 'Logística' },
    ];

    return (
        <nav className="bg-white border-b border-sb-neutral-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex gap-6">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'py-3 border-b-2 text-sm font-medium transition-colors',
                                pathname === item.href
                                    ? 'border-sb-verde-mar text-sb-verde-mar'
                                    : 'border-transparent text-sb-neutral-500 hover:text-sb-neutral-700 hover:border-sb-neutral-300'
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}

function KPI({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string | number, color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-sb-neutral-200 flex items-start gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color }}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-sb-neutral-900">{value}</p>
                <p className="text-sm text-sb-neutral-600">{label}</p>
            </div>
        </div>
    )
}


export function WarehouseDashboardPage({ inventory, shipments }: { inventory: InventoryItem[], shipments: Shipment[] }) {
    
    const kpis = useMemo(() => {
        const stockUnits = inventory.reduce((sum, item) => sum + item.qty, 0);
        const stockValue = inventory.reduce((sum, item) => sum + (item.qty * 8.5), 0); // Precio coste estimado
        const pendingShipments = shipments.filter(s => s.status === 'pending' || s.status === 'picking').length;

        return {
            stockUnits: stockUnits.toLocaleString('es-ES'),
            stockValue: stockValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }),
            pendingShipments,
        }
    }, [inventory, shipments]);

    const shipmentCols: Col<Shipment>[] = [
        { key: 'id', header: 'Envío', render: r => <Link href={`/warehouse/logistics/${r.id}`} className="font-mono text-xs font-semibold text-sb-verde-mar hover:underline">{r.id}</Link> },
        { key: 'customerName', header: 'Cliente' },
        { key: 'city', header: 'Destino' },
        { key: 'status', header: 'Estado', render: r => <StatusPill status={r.status} /> },
        { key: 'createdAt', header: 'F. Creación', render: r => new Date(r.createdAt).toLocaleDateString('es-ES') },
        { 
            key: 'actions', 
            header: 'Acciones', 
            render: r => (
                 <Link href={`/warehouse/logistics/${r.id}`}>
                    <Button variant="subtle">Ver</Button>
                </Link>
            ) 
        }
    ];

    const lowStockItems = inventory.filter(item => item.qty < 50 && item.sku.startsWith('SB-'));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPI icon={Package} label="Unidades en Stock" value={kpis.stockUnits} color={SB_COLORS.warehouse} />
                <KPI icon={DollarSign} label="Valor del Stock" value={kpis.stockValue} color="#0d9488" />
                <KPI icon={Truck} label="Envíos Pendientes" value={kpis.pendingShipments} color="#f59e0b" />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card title="Envíos Recientes" accent={SB_COLORS.warehouse}>
                         <DataTableSB rows={shipments.slice(0,10)} cols={shipmentCols as any} />
                    </Card>
                </div>
                 <div className="space-y-6">
                     <Card title="Alertas de Stock Bajo" accent={SB_COLORS.warehouse}>
                         <div className="p-2 space-y-1">
                             {lowStockItems.length > 0 ? lowStockItems.map(item => (
                                 <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                                     <div>
                                         <p className="font-semibold text-sm text-amber-900">{item.sku}</p>
                                         <p className="text-xs text-amber-700">{item.lotNumber}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="font-bold text-amber-900">{item.qty}</p>
                                        <p className="text-xs text-amber-700">unidades</p>
                                     </div>
                                 </div>
                             )) : <p className="text-sm text-sb-neutral-500 p-4 text-center">No hay alertas de stock.</p>}
                         </div>
                    </Card>
                 </div>
            </div>
        </div>
    )
}

export function LogisticsPage() {
    // Para el futuro: esta página mostrará el detalle de un envío, permitirá imprimir etiquetas, etc.
    return (
         <Card title="Logística y Envíos" accent={SB_COLORS.warehouse}>
            <div className="p-6 text-center text-sb-neutral-500">
                <Truck size={32} className="mx-auto mb-2 text-sb-neutral-400" />
                <h3 className="font-semibold">Página de Logística</h3>
                <p className="text-sm">Aquí se gestionarán los envíos, la preparación de pedidos (picking) y la impresión de etiquetas.</p>
            </div>
        </Card>
    );
}
