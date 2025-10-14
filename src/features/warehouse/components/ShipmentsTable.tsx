// src/features/warehouse/components/ShipmentsTable.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { MoreHorizontal, FileText, PackageCheck, Truck } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import type { Shipment, OrderSellOut, Account, ShipmentStatus } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { markShipped } from '@/server/actions/logistics.actions';

function getChannelInfo(order?: OrderSellOut, account?: Account) {
    if (!account) return { label: "N/A", className: "bg-zinc-100 text-zinc-900 border-zinc-200" };

    if (account.accountType === 'ONLINE') return { label: "Online", className: "bg-emerald-100 text-emerald-900 border-emerald-200" };
    if (account.accountType === 'DISTRIBUIDOR') return { label: "Distribuidor", className: "bg-sky-100 text-sky-900 border-sky-200" };
    return { label: account.accountType, className: "bg-zinc-100 text-zinc-900 border-zinc-200" };
}

// Mapa de estilos CSS para cada estado (Partial para cubrir solo los que usamos)
const STATUS_CLASSNAMES: Partial<Record<ShipmentStatus, string>> = {
  pending: "bg-yellow-100 text-yellow-800",
  picking: "bg-blue-100 text-blue-800",
  ready_to_ship: "bg-indigo-100 text-indigo-800",
  shipped: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  exception: "bg-orange-100 text-orange-800",
  DRAFT: "bg-yellow-100 text-yellow-800",
  READY: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-cyan-100 text-cyan-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Partial<Record<ShipmentStatus, string>> = {
  pending: "Pendiente",
  picking: "Picking",
  ready_to_ship: "Listo para enviar",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  exception: "Excepción",
  DRAFT: "Borrador",
  READY: "Listo",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
};

function StatusBadge({ status }: { status: ShipmentStatus }) {
    const className = STATUS_CLASSNAMES[status] || 'bg-zinc-100 text-zinc-800';
    const label = STATUS_LABELS[status] || status;
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
            {label}
        </span>
    );
}

export function ShipmentsTable({ shipments, onValidateShipment }: { shipments: Shipment[], onValidateShipment: (shipment: Shipment) => void; }) {
    const { data: santaData } = useData();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const orderMap = React.useMemo(() => {
        const map = new Map<string, OrderSellOut>();
        (santaData?.ordersSellOut || []).forEach(o => map.set(o.id, o));
        return map;
    }, [santaData?.ordersSellOut]);

    const accountMap = React.useMemo(() => new Map((santaData?.accounts || []).map(a => [a.id, a])), [santaData?.accounts]);

    const handleMarkShipped = (shipment: Shipment) => {
        startTransition(async () => {
            try {
                await markShipped({ shipmentId: shipment.id });
                toast.success(`Envío ${shipment.id} marcado como enviado.`);
                router.refresh();
            } catch (e: any) {
                toast.error(`Error: ${e.message}`);
            }
        });
    };

    return (
        <SBCard>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-left">
                        <tr className="text-xs font-semibold uppercase text-zinc-600">
                            <th className="p-3">ID Envío</th>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Canal</th>
                            <th className="p-3">Cliente</th>
                            <th className="p-3">Artículos</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {shipments.map(shipment => {
                            const order = orderMap.get(shipment.orderId);
                            const account = accountMap.get(order?.accountId || '');
                            const channelInfo = getChannelInfo(order, account);
                            return (
                                <tr key={shipment.id} className="hover:bg-zinc-50">
                                    <td className="p-3 font-mono text-xs">{shipment.id.substring(0, 8)}...</td>
                                    <td className="p-3">{new Date(shipment.createdAt).toLocaleDateString('es-ES')}</td>
                                    <td className="p-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${channelInfo.className}`}>{channelInfo.label}</span></td>
                                    <td className="p-3">
                                        <p className="font-medium">{shipment.customerName || 'N/A'}</p>
                                        <p className="text-xs text-zinc-500">{shipment.city}</p>
                                    </td>
                                    <td className="p-3 text-xs">
                                      {shipment.lines.map((l:any, i:number) => <div key={i}>{l.qty}x {l.name}</div>)}
                                    </td>
                                    <td className="p-3"><StatusBadge status={shipment.status} /></td>
                                    <td className="p-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <SBButton variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></SBButton>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-48">
                                                <DropdownMenuItem onSelect={() => onValidateShipment(shipment)}>
                                                    <PackageCheck className="mr-2 h-4 w-4" /> Validar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleMarkShipped(shipment)}>
                                                    <Truck className="mr-2 h-4 w-4" /> Marcar Enviado
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/api/shipment/${shipment.id}/delivery-note`} target="_blank">
                                                        <FileText className="mr-2 h-4 w-4" /> Albarán
                                                    </Link>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {shipments.length === 0 && <p className="text-center text-sm text-zinc-500 p-8">No se encontraron envíos.</p>}
            </div>
        </SBCard>
    );
}
