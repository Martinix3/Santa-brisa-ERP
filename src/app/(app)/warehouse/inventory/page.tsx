

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Truck, PackageCheck, AlertCircle, ChevronDown, Printer, FileText, Plus, Download, MoreVertical, Package, Tag, Calendar, CheckCircle, XCircle, Hourglass } from "lucide-react";
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { SBCard, Input, Select, DataTableSB } from '@/components/ui/ui-primitives';
import Link from 'next/link';

import { listLots, listMaterials } from "@/features/production/ssot-bridge";
import type { Lot, Material, InventoryItem, Uom, StockMove, SB_THEME } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';

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
    const [activeTab, setActiveTab] = useState('finished_good');
    const [loading, setLoading] = useState(true);

    const inventory = useMemo(() => {
        if (!santaData?.inventory) return [];
        return [...santaData.inventory].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [santaData?.inventory]);

    useEffect(() => {
        if(santaData?.inventory) setLoading(false);
    }, [santaData?.inventory])
    
    const filteredInventory = inventory.filter(item => {
        if (activeTab === 'packaging') return item.category === 'packaging' || item.category === 'label';
        return item.category === activeTab;
    });
    
    const materialBySkuMap = useMemo(() => {
      const map = new Map<string, Material>();
      (santaData?.materials || []).forEach(m => map.set(m.sku, m));
      return map;
    }, [santaData?.materials]);

    const cols: Col<InventoryItem>[] = [
        { key: 'id', header: 'Lote', render: r => <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded-md">{r.id.substring(0, 12)}...</span> },
        { 
            key: 'sku', 
            header: 'Producto (SKU)',
            render: r => (
                <div>
                    <span className="font-medium text-zinc-800">{materialBySkuMap.get(r.sku)?.name || r.sku}</span>
                    <p className="text-xs text-zinc-500">{r.sku}</p>
                </div>
            )
        },
        { key: 'qty', header: 'Cantidad', className: "text-right", render: r => <span className="font-semibold">{r.qty} {r.uom}</span> },
        { key: 'createdAt', header: 'Fecha', render: r => new Date(r.createdAt).toLocaleDateString('es-ES') },
        { key: 'expDate', header: 'Caducidad', render: r => <ExpirationPill date={r.expDate} /> },
        { 
            key: 'quality', 
            header: 'Estado Calidad', 
            render: r => r.quality?.qcStatus ? <LotQualityStatusPill status={r.quality.qcStatus} /> : <span className="text-zinc-400">—</span>
        },
        { key: 'actions', header: 'Acciones', render: r => (<div className="relative"><MoreVertical size={16} className="cursor-pointer" /></div>) }
    ];

    const TABS = [
        { id: 'finished_good', label: 'Producto Terminado' },
        { id: 'raw', label: 'Materia Prima' },
        { id: 'intermediate', label: 'Intermedios' },
        { id: 'packaging', label: 'Packaging' },
        { id: 'merchandising', label: 'Merchandising' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800">Inventario por Lotes</h1>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-md px-3 py-1.5 outline-none hover:bg-zinc-50 focus:ring-2 focus:ring-cyan-400">
                        <Download size={14} /> Exportar
                    </button>
                    <Link href="/warehouse/goods-receipt" className="flex items-center gap-2 text-sm bg-cyan-600 text-white rounded-md px-3 py-1.5 outline-none hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-400">
                        <Plus size={14} /> Añadir Entrada de Stock
                    </Link>
                </div>
            </div>

            <Tabs active={activeTab} setActive={setActiveTab} tabs={TABS} />
            
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
