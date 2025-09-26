// src/app/(app)/warehouse/inventory/page.tsx

"use client";
import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Truck, PackageCheck, AlertCircle, ChevronDown, Printer, FileText, Plus, Download, MoreVertical, Package, Tag, Calendar, CheckCircle, XCircle, Hourglass } from "lucide-react";
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { SBCard, Input, Select, DataTableSB } from '@/components/ui/ui-primitives';
import Link from 'next/link';

import type { OnHandView, Item, ItemCategory, SB_THEME } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { rebuildOnHand } from './actions';

function LotQualityStatusPill({ status }: { status?: 'hold' | 'release' | 'reject' }) {
  const map: Record<string, string> = {
    hold: 'bg-yellow-100 text-yellow-800',
    release: 'bg-green-100 text-green-800',
    reject: 'bg-red-100 text-red-800',
  };
  const s = status || 'hold';
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${map[s]}`}>{s}</span>;
}

type Col<T> = {
    key: keyof T | string;
    header: string;
    className?: string;
    render?: (row: T) => React.ReactNode;
};

function Tabs({ active, setActive, tabs }: { active: string; setActive: (id: string) => void; tabs: {id: string, label: string}[] }) {
  return (
    <div className="border-b border-zinc-200">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${ active === tab.id
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ExpirationPill({ date }: { date?: string }) {
    if (!date) return <span className="text-zinc-400">—</span>;

    const expDate = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let color = 'text-green-700 bg-green-100';
    if (diffDays <= 0) color = 'text-red-700 bg-red-100';
    else if (diffDays <= 30) color = 'text-yellow-700 bg-yellow-100';

    return (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
            {expDate.toLocaleDateString('es-ES')} ({diffDays > 0 ? `en ${diffDays}d` : 'Caducado'})
        </span>
    );
}

export default function InventoryPage() {
    const { data: santaData } = useData();
    const [activeTab, setActiveTab] = useState<ItemCategory>('fg');
    const [loading, setLoading] = useState(true);
    const [pending, startTransition] = useTransition();

    const onHand = useMemo(() => {
        if (!santaData?.onHand) return [];
        return [...santaData.onHand].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [santaData?.onHand]);

    useEffect(() => {
        if(santaData?.onHand) setLoading(false);
    }, [santaData?.onHand])
    
    const itemsById = useMemo(() => {
        const map = new Map<string, Item>();
        (santaData?.items || []).forEach(it => map.set(it.id, it));
        return map;
    }, [santaData?.items]);

    const filteredInventory = useMemo(() => {
        return onHand.filter(oh => {
            const item = itemsById.get(oh.itemId);
            if (!item) return false;
            
            if (activeTab === 'pack') {
              return item.category === 'pack' || item.category === 'label';
            }
            return item.category === activeTab;
        });
    }, [onHand, itemsById, activeTab]);

    const cols: Col<OnHandView>[] = [
        { key: 'lotNumber', header: 'Lote', render: r => <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded-md">{r.lotNumber || r.id.substring(0, 12)}</span> },
        { 
            key: 'itemId', 
            header: 'Producto (SKU)',
            render: r => {
                const item = itemsById.get(r.itemId);
                return (
                    <div>
                        <span className="font-medium text-zinc-800">{item?.name || r.itemId}</span>
                        <p className="text-xs text-zinc-500">{item?.sku}</p>
                    </div>
                );
            }
        },
        { key: 'qty', header: 'Cantidad', className: "text-right", render: r => <span className="font-semibold">{r.qty} {r.uom}</span> },
        { key: 'locationId', header: 'Ubicación', render: r => r.locationId },
        { key: 'updatedAt', header: 'Fecha', render: r => new Date(r.updatedAt).toLocaleDateString('es-ES') },
    ];

    const TABS: { id: ItemCategory, label: string }[] = [
        { id: 'fg', label: 'Producto Terminado' },
        { id: 'raw', label: 'Materias Primas' },
        { id: 'intermediate', label: 'Intermedios' },
        { id: 'pack', label: 'Packaging y Etiquetas' },
        { id: 'merch', label: 'Merchandising' },
        { id: 'consumable', label: 'Consumibles' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800">Inventario</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => startTransition(async () => { await rebuildOnHand(); })}
                        className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-md px-3 py-1.5 hover:bg-zinc-50"
                        disabled={pending}
                    >
                        {pending ? 'Recalculando...' : 'Recalcular on-hand'}
                    </button>
                    <button className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-md px-3 py-1.5 outline-none hover:bg-zinc-50 focus:ring-2 focus:ring-cyan-400">
                        <Download size={14} /> Exportar
                    </button>
                    <Link href="/warehouse/goods-receipt" className="flex items-center gap-2 text-sm bg-cyan-600 text-white rounded-md px-3 py-1.5 outline-none hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-400">
                        <Plus size={14} /> Añadir Entrada de Stock
                    </Link>
                </div>
            </div>

            <Tabs active={activeTab} setActive={(tabId) => setActiveTab(tabId as ItemCategory)} tabs={TABS} />
            
            <SBCard title="">
            {loading ? (
                <div className="text-center py-12 text-zinc-500">Cargando inventario...</div>
            ) : (
                <DataTableSB rows={filteredInventory} cols={cols as any} />
            )}
            </SBCard>
        </div>
    );
}
