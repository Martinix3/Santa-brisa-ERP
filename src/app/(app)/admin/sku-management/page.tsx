
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { listLots, listMaterials, updateMaterial } from '@/features/production/ssot-bridge';
import type { Lot, Material } from '@/domain/ssot';
import { MATERIAL_CATEGORIES } from '@/domain/ssot';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { ChevronDown, Save, Tags } from 'lucide-react';
import { LotQualityStatusPill } from '@/features/production/components/ui';
import { ModuleHeader } from '@/components/ui/ModuleHeader';

type SkuWithLots = {
    sku: string;
    material: Material;
    lots: Lot[];
};

function SkuRow({ item, onUpdateCategory }: { item: SkuWithLots; onUpdateCategory: (sku: string, newCategory: Material['category']) => void; }) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="border-b">
            <div 
                className="grid grid-cols-[auto_2fr_1fr_1fr_1fr] items-center gap-4 p-3 cursor-pointer hover:bg-zinc-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <div>
                    <p className="font-bold text-sm text-zinc-800">{item.material?.name || 'Nombre Desconocido'}</p>
                    <p className="font-mono text-xs bg-zinc-100 px-2 py-0.5 rounded-full inline-block mt-1">{item.sku}</p>
                </div>
                <div onClick={e => e.stopPropagation()}>
                   <select 
                        value={item.material.category}
                        onChange={(e) => onUpdateCategory(item.sku, e.target.value as Material['category'])}
                        className="w-full h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                        {(MATERIAL_CATEGORIES || []).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="text-sm font-semibold">{item.lots.length} lotes</div>
                <div className="text-sm font-semibold text-right">{item.lots.reduce((acc, lot) => acc + lot.quantity, 0)} uds.</div>
            </div>
            {isOpen && (
                <div className="bg-zinc-50/70 p-4 pl-12">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Lotes Asociados</h4>
                    <div className="space-y-2">
                        {item.lots.map(lot => (
                            <div key={lot.id} className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-4 items-center text-xs p-2 bg-white rounded-md border">
                                <p className="font-mono">{lot.id}</p>
                                <p>{lot.quantity} uds.</p>
                                <p>{new Date(lot.createdAt).toLocaleDateString('es-ES')}</p>
                                <div className="text-right">
                                    <LotQualityStatusPill status={lot.quality.qcStatus} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


function SkuManagementPageContent() {
    const [skuData, setSkuData] = useState<SkuWithLots[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const [materialsRes, lotsRes] = await Promise.all([listMaterials(), listLots()]);
        
        const materials = materialsRes || [];
        const lots = lotsRes || [];

        const lotsBySku = new Map<string, Lot[]>();
        lots.forEach(lot => {
            const existing = lotsBySku.get(lot.sku) || [];
            lotsBySku.set(lot.sku, [...existing, lot]);
        });

        const enrichedData: SkuWithLots[] = materials.map(mat => ({
            sku: mat.sku || mat.id,
            material: mat,
            lots: lotsBySku.get(mat.sku || mat.id) || []
        })).sort((a,b) => a.sku.localeCompare(b.sku));
        
        setSkuData(enrichedData);
        setLoading(false);
        setHasChanges(false);
    }

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateCategory = (sku: string, newCategory: Material['category']) => {
        setSkuData(prevData =>
            prevData.map(item =>
                item.sku === sku
                    ? { ...item, material: { ...item.material, category: newCategory } }
                    : item
            )
        );
        setHasChanges(true);
    };

    const handleSaveChanges = async () => {
        for (const item of skuData) {
            // En una app real, compararías con el original para solo enviar cambios
            await updateMaterial(item.material.id, { category: item.material.category });
        }
        alert('¡Categorías guardadas!');
        setHasChanges(false);
    };

    return (
        <div className="space-y-6">
            <p className="text-zinc-600 mt-1">Vista maestra de todos los productos, sus SKUs y lotes asociados.</p>
            <SBCard title="Listado de Productos por SKU">
                <div>
                     <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr] items-center gap-4 p-3 border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                        <div />
                        <span>Producto</span>
                        <span>Categoría</span>
                        <span>Nº Lotes</span>
                        <span className="text-right">Stock Total</span>
                    </div>
                    {loading ? (
                        <p className="p-8 text-center text-zinc-500">Cargando datos...</p>
                    ) : (
                        skuData.map(item => <SkuRow key={item.sku} item={item} onUpdateCategory={handleUpdateCategory} />)
                    )}
                </div>
                {hasChanges && (
                    <div className="p-4 border-t bg-zinc-50 flex justify-end">
                        <SBButton
                            onClick={handleSaveChanges}
                        >
                            <Save size={16} /> Guardar Cambios
                        </SBButton>
                    </div>
                )}
            </SBCard>
        </div>
    );
}

export default function SkuManagementPage() {
    return (
        <>
            <ModuleHeader title="Gestión de SKUs" icon={Tags} />
            <div className="bg-zinc-50 flex-grow">
                <div className="max-w-7xl mx-auto py-6 px-4">
                    <SkuManagementPageContent />
                </div>
            </div>
        </>
    )
}
