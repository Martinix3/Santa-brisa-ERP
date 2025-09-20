
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Truck, PackageCheck, AlertCircle, ChevronDown, Printer, FileText, Plus, Download, MoreVertical, Package, Tag, Calendar, CheckCircle, XCircle, Hourglass } from "lucide-react";
import { DataTableSB, Col, LotQualityStatusPill } from '@/components/ui/ui-primitives';
import { listLots, listMaterials } from "@/features/production/ssot-bridge";
import type { Lot, Material, InventoryItem, Uom } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';


type UnifiedInventoryItem = {
    id: string;
    lotNumber?: string;
    sku: string;
    productName: string;
    category: Material['category'];
    quantity: number;
    createdAt: string;
    expDate?: string;
    quality?: {
        qcStatus?: 'hold' | 'release' | 'reject';
    };
    uom: Uom;
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
    const [inventory, setInventory] = useState<UnifiedInventoryItem[]>([]);
    const [activeTab, setActiveTab] = useState('finished_good');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadInventory() {
            if (!santaData) return;
            setLoading(true);

            const { lots, materials, inventory: rawInventory } = santaData;
            const materialMap = new Map(materials.map(m => [m.id, m]));
            const materialBySkuMap = new Map(materials.map(m => [m.sku, m]));

            const finishedGoods: UnifiedInventoryItem[] = (lots || []).map(lot => {
                const material = materialMap.get(lot.sku) || materialBySkuMap.get(lot.sku);
                return {
                    id: lot.id,
                    lotNumber: lot.id,
                    sku: lot.sku,
                    productName: material?.name || lot.sku,
                    category: material?.category || 'finished_good',
                    quantity: lot.quantity,
                    createdAt: lot.createdAt,
                    expDate: lot.dates?.expDate,
                    quality: {
                        qcStatus: lot.quality?.qcStatus
                    },
                    uom: 'uds',
                }
            });
            
            const otherInventory: UnifiedInventoryItem[] = (rawInventory || []).map(item => {
                 const material = materialBySkuMap.get(item.sku) || materialMap.get(item.sku);
                 return {
                    id: item.id,
                    lotNumber: item.lotNumber,
                    sku: item.sku,
                    productName: material?.name || item.sku,
                    category: material?.category || 'raw',
                    quantity: item.qty,
                    createdAt: item.updatedAt,
                    expDate: item.expDate,
                    uom: item.uom,
                 }
            });
            
            const allInventory = [...finishedGoods, ...otherInventory];
            setInventory(allInventory.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setLoading(false);
        }
        loadInventory();
    }, [santaData]);
    
    const filteredInventory = inventory.filter(item => {
        if (activeTab === 'packaging') return item.category === 'packaging' || item.category === 'label';
        return item.category === activeTab;
    });

    const cols: Col<UnifiedInventoryItem>[] = [
        { key: 'lotNumber', header: 'Lote', render: r => <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded-md">{r.lotNumber || r.id}</span> },
        { 
            key: 'productName', 
            header: 'Producto (SKU)',
            render: r => (
                <div>
                    <span className="font-medium text-zinc-800">{r.productName}</span>
                    <p className="text-xs text-zinc-500">{r.sku}</p>
                </div>
            )
        },
        { key: 'quantity', header: 'Cantidad', className: "justify-end", render: r => <span className="font-semibold">{r.quantity} {r.uom}</span> },
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
                    <button className="flex items-center gap-2 text-sm bg-cyan-600 text-white rounded-md px-3 py-1.5 outline-none hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-400">
                        <Plus size={14} /> Ajuste Manual
                    </button>
                </div>
            </div>

            <Tabs active={activeTab} setActive={setActiveTab} tabs={TABS} />
            
            {loading ? (
                <div className="text-center py-12 text-zinc-500">Cargando inventario...</div>
            ) : (
                <DataTableSB rows={filteredInventory} cols={cols as any} />
            )}
        </div>
    );
}
