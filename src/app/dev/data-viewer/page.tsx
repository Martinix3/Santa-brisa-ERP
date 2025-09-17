
"use client";

import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Database, Check, X, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { SBCard } from '@/components/ui/ui-primitives';
import type { SantaData } from '@/domain/ssot';

const FK_RELATIONS: Record<string, keyof SantaData> = {
    accountId: 'accounts',
    userId: 'users',
    managerId: 'users',
    distributorId: 'distributors',
    ownerUserId: 'users',
    billerPartnerId: 'distributors',
    ownerPartnerId: 'distributors',
    materialId: 'materials',
    productId: 'products',
    bomId: 'billOfMaterials',
    orderId: 'ordersSellOut',
    shipmentId: 'shipments',
    prodOrderId: 'productionOrders',
    lotId: 'lots',
    creatorId: 'creators',
    supplierId: 'suppliers',
    'lines.sku': 'products',
    'items.materialId': 'materials'
};

const COLLECTION_SCHEMAS: Record<string, string[]> = {
    users: ['id', 'name', 'email', 'role', 'active', 'managerId'],
    accounts: ['id', 'name', 'city', 'stage', 'type', 'mode', 'distributorId', 'cif', 'address', 'phone', 'createdAt'],
    products: ['id', 'sku', 'name', 'category', 'bottleMl', 'caseUnits', 'casesPerPallet', 'active', 'materialId'],
    interactions: ['id', 'accountId', 'userId', 'kind', 'note', 'createdAt'],
    ordersSellOut: ['id', 'accountId', 'userId', 'distributorId', 'status', 'createdAt', 'lines'],
    materials: ['id', 'sku', 'name', 'category', 'unit', 'standardCost'],
    lots: ['id', 'sku', 'quantity', 'createdAt', 'orderId', 'quality', 'expDate'],
    shipments: ['id', 'status', 'createdAt', 'accountId', 'lines'],
    productionOrders: ['id', 'sku', 'bomId', 'targetQuantity', 'status', 'createdAt', 'lotId'],
    billOfMaterials: ['id', 'sku', 'name', 'items', 'batchSize', 'baseUnit'],
    inventory: ['id', 'sku', 'lotNumber', 'uom', 'qty', 'locationId', 'expDate', 'updatedAt'],
    stockMoves: ['id', 'sku', 'lotNumber', 'uom', 'qty', 'from', 'to', 'reason', 'at'],
    creators: ['id', 'name', 'handle', 'platform', 'tier', 'audience'],
    influencerCollabs: ['id', 'creatorId', 'creatorName', 'status', 'deliverables', 'compensation'],
    mktEvents: ['id', 'title', 'kind', 'status', 'startAt'],
};


function RelationAnalysis({ collectionName, collection, data }: { collectionName: keyof SantaData; collection: any[], data: SantaData }) {
    const analysis = useMemo(() => {
        const schema = COLLECTION_SCHEMAS[collectionName] || [];
        const potentialRelations: Record<string, { total: number; valid: number; missing: string[] }> = {};

        // Pre-fill relations from schema
        for (const key of schema) {
            if (FK_RELATIONS[key]) {
                potentialRelations[key] = { total: 0, valid: 0, missing: [] };
            }
        }
        
        if (!collection || collection.length === 0) {
            return Object.entries(potentialRelations);
        }
        
        collection.forEach((item, rowIndex) => {
            for (const key in item) {
                if (FK_RELATIONS[key]) {
                    if (!potentialRelations[key]) potentialRelations[key] = { total: 0, valid: 0, missing: [] };
                    potentialRelations[key].total++;
                    
                    const foreignKey = item[key];
                    if (foreignKey) {
                        const targetCollection = data[FK_RELATIONS[key]] as any[];
                        if (targetCollection?.some(targetItem => targetItem.id === foreignKey)) {
                            potentialRelations[key].valid++;
                        } else {
                            potentialRelations[key].missing.push(`Fila ${rowIndex} (${item.id || 'sin id'}): ${key} '${foreignKey}' no encontrado.`);
                        }
                    }
                }
            }
        });
        return Object.entries(potentialRelations);

    }, [collectionName, collection, data]);

    if (analysis.length === 0) {
        return <p className="text-sm text-zinc-500">No se detectaron relaciones de clave foránea para esta colección.</p>;
    }

    return (
        <div className="space-y-3">
            {analysis.map(([key, stats]) => (
                <div key={key} className="p-3 rounded-lg border bg-zinc-50/50">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-zinc-800">{key} → {FK_RELATIONS[key]}</span>
                        {stats.total > 0 ? (
                             stats.total === stats.valid ? (
                                <span className="flex items-center gap-1 font-bold text-green-600"><Check size={14}/> {stats.valid}/{stats.total} Válidas</span>
                            ) : (
                                 <span className="flex items-center gap-1 font-bold text-red-600"><AlertTriangle size={14}/> {stats.valid}/{stats.total} Válidas</span>
                            )
                        ) : (
                             <span className="text-xs text-zinc-400"> (No hay datos para analizar)</span>
                        )}
                    </div>
                    {stats.missing.length > 0 && (
                        <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-red-700">Ver {stats.missing.length} IDs no encontrados</summary>
                            <ul className="list-disc list-inside pl-2 mt-1 max-h-24 overflow-y-auto">
                                {stats.missing.slice(0, 10).map((err, i) => <li key={i} className="font-mono">{err}</li>)}
                            </ul>
                        </details>
                    )}
                </div>
            ))}
        </div>
    );
}

function TableViewer({ collection, collectionName }: { collection: any[], collectionName: string }) {
    const columns = useMemo(() => {
        if (collection && collection.length > 0) return Object.keys(collection[0]);
        return COLLECTION_SCHEMAS[collectionName] || [];
    }, [collection, collectionName]);
    
    if (!collection) {
        return <p className="text-center text-zinc-500 py-8">Selecciona una colección para ver sus datos.</p>
    }

    return (
        <div className="overflow-auto max-h-[70vh] border rounded-lg">
            <table className="w-full text-xs text-left">
                <thead className="bg-zinc-100 sticky top-0">
                    <tr>
                        {columns.map(col => <th key={col} className="p-2 font-semibold whitespace-nowrap">{col}</th>)}
                    </tr>
                </thead>
                {collection.length > 0 ? (
                    <tbody className="divide-y divide-zinc-100">
                        {collection.map((row, index) => (
                            <tr key={row.id || index} className="hover:bg-zinc-50">
                                {columns.map(col => (
                                    <td key={col} className="p-2 align-top whitespace-pre-wrap max-w-xs truncate">
                                        {typeof row[col] === 'object' && row[col] !== null 
                                            ? JSON.stringify(row[col]) 
                                            : String(row[col] ?? 'null')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                ) : (
                    <tbody>
                        <tr>
                            <td colSpan={columns.length} className="text-center text-zinc-500 py-8">
                                La colección está vacía.
                            </td>
                        </tr>
                    </tbody>
                )}
            </table>
        </div>
    );
}

function DataViewerPageContent() {
    const { data, mode } = useData();
    const [selectedKey, setSelectedKey] = useState<keyof SantaData | null>('accounts');

    if (!data) {
        return (
            <div className="p-6 text-center">
                <p className="text-lg font-semibold">Cargando datos...</p>
                <p className="text-sm text-zinc-500">Esperando que el DataProvider se inicialice.</p>
            </div>
        );
    }

    const dataSummary = Object.keys(data).map(key => {
        const value = (data as any)[key];
        const count = Array.isArray(value) ? value.length : (typeof value === 'object' && value !== null) ? Object.keys(value).length : '-';
        return { key: key as keyof SantaData, count };
    }).sort((a,b) => a.key.localeCompare(b.key));

    const selectedCollection = selectedKey ? (data as any)[selectedKey] : null;

    return (
        <div className="max-w-full mx-auto space-y-6">
            <p className="text-zinc-600 mt-1">
                Inspecciona el contenido del proveedor de datos (`santaData`) en tiempo real. El modo actual es: <strong className="font-semibold text-zinc-800">{mode}</strong>.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-6 items-start">
                <div>
                    <SBCard title="Colecciones de Datos">
                        <div className="divide-y divide-zinc-100 max-h-[70vh] overflow-y-auto">
                            {dataSummary.map(({ key, count }) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedKey(key)}
                                    className={`w-full flex justify-between items-center px-4 py-3 text-sm text-left transition-colors ${selectedKey === key ? 'bg-yellow-50 font-semibold' : 'hover:bg-zinc-50'}`}
                                >
                                    <span>{key}</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700">{count}</span>
                                </button>
                            ))}
                        </div>
                    </SBCard>
                     <div className="mt-4">
                        <SBCard title="Análisis de Relaciones (FK)">
                           <div className="p-4">
                             {selectedKey && <RelationAnalysis collectionName={selectedKey} collection={selectedCollection} data={data}/>}
                           </div>
                        </SBCard>
                    </div>
                </div>

                <div>
                    <SBCard title={`Visor de Tabla: ${selectedKey || 'Selecciona una colección'}`}>
                        <div className="p-2 bg-white rounded-b-2xl">
                           <TableViewer collection={selectedCollection} collectionName={selectedKey || ''} />
                        </div>
                    </SBCard>
                </div>
            </div>
        </div>
    );
}

export default function DataViewerPage() {
    return (
        <>
            <ModuleHeader title="Visor de Datos del SSOT" icon={Database}/>
            <div className="p-6">
                <DataViewerPageContent />
            </div>
        </>
    );
}
