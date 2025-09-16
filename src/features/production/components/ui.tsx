

"use client";
import React, { useMemo } from "react";
import type { ProductionOrder, Lot } from "@/domain/ssot";
import { SBCard, SBButton, SB_COLORS } from "@/components/ui/ui-primitives";
import { Factory, Cpu, BookOpen, Waypoints, AlertCircle, Hourglass, MoreVertical, Check, X, Thermometer, FlaskConical, Beaker, TestTube2, Paperclip, Upload, Trash2 } from "lucide-react";
import Link from 'next/link';

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

function StatusPill({status}:{status: 'pending'|'released'|'wip'|'done'|'cancelled'}){
  const map:any = {
    pending: { txt:'Pendiente', bg:'bg-sb-neutral-100 text-sb-neutral-700' },
    released: { txt:'Liberada', bg:'bg-blue-100 text-blue-800' },
    wip: { txt:'En curso', bg:'bg-amber-100 text-amber-800' },
    done: { txt:'Cerrada', bg:'bg-green-100 text-green-800' },
    cancelled: { txt:'Cancelada', bg:'bg-red-100 text-red-700' },
  };
  const s = map[status] || map.pending;
  return <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${s.bg}`}>{s.txt}</span>;
}

export function ProductionDashboard({ orders, lots }: { orders: ProductionOrder[], lots: Lot[] }) {

    const kpis = useMemo(() => {
        const activeOrders = orders.filter(o => o.status === 'wip' || o.status === 'released');
        const pendingQCLots = lots.filter(l => l.quality?.qcStatus === 'hold');
        const overdueOrders = orders.filter(o => {
            const isLate = new Date(o.createdAt) < new Date(Date.now() - 3 * 86400000); // >3 days old
            return (o.status === 'pending' || o.status === 'released') && isLate;
        });

        return {
            activeOrders: activeOrders.length,
            pendingQCLots: pendingQCLots.length,
            overdueOrders: overdueOrders.length,
        }
    }, [orders, lots]);

    const orderCols: { key: keyof ProductionOrder | 'actions', header: string, render?: (r:ProductionOrder) => React.ReactNode, className?: string }[] = [
      { key: 'id', header: 'Orden', render: r => <span className="font-mono text-xs font-semibold">{r.id}</span> },
      { key: 'sku', header: 'SKU' },
      { key: 'targetQuantity', header: 'Cantidad', className:"justify-end", render: r => <span className="font-semibold">{r.targetQuantity}</span> },
      { key: 'status', header: 'Estado', render: r => <StatusPill status={r.status as any} /> },
      { key: 'createdAt', header: 'F. Creación', render: r => new Date(r.createdAt).toLocaleDateString('es-ES') },
      { 
        key: 'actions', 
        header: 'Acciones', 
        render: r => (
          <Link href={`/production/execution?orderId=${r.id}`}>
            <SBButton variant="subtle">Ver</SBButton>
          </Link>
        ) 
      }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPI icon={Factory} label="Órdenes Activas" value={kpis.activeOrders} color={SB_COLORS.production} />
                <KPI icon={AlertCircle} label="Órdenes Retrasadas" value={kpis.overdueOrders} color={SB_COLORS.production} />
                <KPI icon={Hourglass} label="Lotes Pendientes QC" value={kpis.pendingQCLots} color={SB_COLORS.primary} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SBCard title="Órdenes de Producción" accent={SB_COLORS.production}>
                        <div className="divide-y divide-zinc-100">
                        {orders.map(order => (
                            <div key={order.id} className="grid grid-cols-6 gap-4 p-3 items-center hover:bg-zinc-50">
                                {orderCols.map(col => (
                                    <div key={String(col.key)} className={`text-sm ${col.className || ''}`}>
                                        {col.render ? col.render(order) : String(order[col.key as keyof ProductionOrder] || '')}
                                    </div>
                                ))}
                            </div>
                        ))}
                        </div>
                    </SBCard>
                </div>
                <div className="space-y-6">
                     <SBCard title="Acciones Rápidas" accent={SB_COLORS.production}>
                        <div className="p-4 grid grid-cols-2 gap-3">
                           <Link href="/production/bom" className="text-center p-4 rounded-xl bg-sb-neutral-50 hover:bg-sb-neutral-100 border border-sb-neutral-200">
                                <BookOpen className="mx-auto h-8 w-8 text-sb-neutral-600 mb-2"/>
                                <span className="text-sm font-semibold">Gestionar BOMs</span>
                           </Link>
                            <Link href="/production/traceability" className="text-center p-4 rounded-xl bg-sb-neutral-50 hover:bg-sb-neutral-100 border border-sb-neutral-200">
                                <Waypoints className="mx-auto h-8 w-8 text-sb-neutral-600 mb-2"/>
                                <span className="text-sm font-semibold">Trazabilidad</span>
                           </Link>
                        </div>
                    </SBCard>
                    <SBCard title="Últimos Lotes Creados" accent={SB_COLORS.production}>
                        <div className="p-2 space-y-2">
                            {lots.slice(0, 5).map(lot => (
                                <div key={lot.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-sb-neutral-50">
                                    <div>
                                        <p className="font-mono text-sm font-semibold">{lot.id}</p>
                                        <p className="text-xs text-sb-neutral-500">{lot.quantity} uds · {new Date(lot.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <LotQualityStatusPill status={lot.quality?.qcStatus} />
                                </div>
                            ))}
                        </div>
                    </SBCard>
                </div>
            </div>
        </div>
    );
}

export function ProductionLayout({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>
}

export function ExecutionPage() {
    return <div>Execution Page</div>
}

export function LotQualityStatusPill({ status }: { status?: 'hold' | 'release' | 'reject' }) {
    const styles = {
        hold: 'bg-yellow-100 text-yellow-800',
        release: 'bg-green-100 text-green-800',
        reject: 'bg-red-100 text-red-800',
    };
    const s = status || 'hold';
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[s]}`}>
            {s.toUpperCase()}
        </span>
    );
}
