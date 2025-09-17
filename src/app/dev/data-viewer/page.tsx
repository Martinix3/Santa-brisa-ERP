
"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Database, Check, X, Link as LinkIcon, AlertTriangle, Upload, Download, Trash2, ChevronDown, Save, PlusCircle, RefreshCw, FileCog, FileUp, Edit2 } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import type { SantaData } from '@/domain/ssot';
import Papa from "papaparse";

// ===== UTILS & HELPERS =====
const normText = (s: any) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// ===== COMPONENTS =====
type StagedItem = {
    id: string;
    type: 'create' | 'update';
    proposedData: Record<string, any>;
    existingAccountId?: string;
    status: 'pending' | 'approved' | 'ignored';
};


function EditableCell({ value, onUpdate }: { value: any, onUpdate: (newValue: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onUpdate(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2 py-1 absolute inset-0 bg-white border-2 border-yellow-400 rounded outline-none z-10"
      />
    );
  }

  return (
    <div
      className="w-full h-full px-2 py-1 truncate cursor-cell"
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')}
    </div>
  );
}

function TableViewer({
  collection,
  collectionName,
  onUpdateRow,
  selectedRows,
  onSelectRow,
  onSelectAll,
}: {
  collection: any[],
  collectionName: string,
  onUpdateRow: (rowIndex: number, newRowData: any) => void,
  selectedRows: Set<string>,
  onSelectRow: (id: string, checked: boolean) => void,
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void,
}) {
    const columns = useMemo(() => {
        if (collection && collection.length > 0) return Object.keys(collection[0]);
        if ((COLLECTION_SCHEMAS as any)[collectionName]) return (COLLECTION_SCHEMAS as any)[collectionName];
        return [];
    }, [collection, collectionName]);

    if (!collection) {
        return <p className="text-center text-zinc-500 py-8">Selecciona una colección para ver sus datos.</p>;
    }

    return (
        <div className="overflow-auto max-h-[70vh] border rounded-lg">
            <table className="w-full text-xs text-left">
                <thead className="bg-zinc-100 sticky top-0 z-20">
                    <tr>
                        <th className="p-2"><input type="checkbox" onChange={onSelectAll} checked={selectedRows.size > 0 && selectedRows.size === collection.length}/></th>
                        {columns.map(col => <th key={col} className="p-2 font-semibold whitespace-nowrap">{col}</th>)}
                    </tr>
                </thead>
                {collection.length > 0 ? (
                    <tbody className="divide-y divide-zinc-100">
                        {collection.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className={`hover:bg-zinc-50 ${selectedRows.has(row.id) ? 'bg-yellow-50' : ''}`}>
                                <td className="p-2"><input type="checkbox" checked={selectedRows.has(row.id)} onChange={e => onSelectRow(row.id, e.target.checked)} /></td>
                                {columns.map(col => (
                                    <td key={col} className="p-0 relative whitespace-pre-wrap max-w-xs">
                                        <EditableCell 
                                            value={row[col]} 
                                            onUpdate={(newValue) => {
                                                const newRow = { ...row, [col]: newValue };
                                                onUpdateRow(rowIndex, newRow);
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                ) : (
                    <tbody>
                        <tr>
                            <td colSpan={columns.length + 1} className="text-center text-zinc-500 py-8">
                                La colección está vacía. Las columnas esperadas son: {columns.join(', ')}
                            </td>
                        </tr>
                    </tbody>
                )}
            </table>
        </div>
    );
}

// ===== SCHEMAS & RELATIONS =====
const FK_RELATIONS: Record<string, keyof SantaData> = { accountId: 'accounts', userId: 'users', managerId: 'users', ownerId: 'users', billerId: 'distributors', materialId: 'materials', bomId: 'billOfMaterials', orderId: 'ordersSellOut', shipmentId: 'shipments', prodOrderId: 'productionOrders', lotId: 'lots', creatorId: 'creators', 'lines.sku': 'products', 'items.materialId': 'materials' };
const COLLECTION_SCHEMAS: Record<string, string[]> = {
    users: ['id', 'name', 'email', 'role', 'active', 'managerId'],
    accounts: ['id', 'name', 'city', 'stage', 'type', 'ownerId', 'billerId', 'cif', 'address', 'phone', 'createdAt'],
    products: ['id', 'sku', 'name', 'category', 'bottleMl', 'caseUnits', 'casesPerPallet', 'active', 'materialId'],
    interactions: ['id', 'accountId', 'userId', 'kind', 'note', 'createdAt'],
    ordersSellOut: ['id', 'accountId', 'userId', 'status', 'createdAt', 'lines'],
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
        for (const key of schema) { if (FK_RELATIONS[key]) potentialRelations[key] = { total: 0, valid: 0, missing: [] }; }
        if (!collection || collection.length === 0) return Object.entries(potentialRelations);
        collection.forEach((item, rowIndex) => {
            for (const key in item) {
                if (FK_RELATIONS[key]) {
                    if (!potentialRelations[key]) potentialRelations[key] = { total: 0, valid: 0, missing: [] };
                    potentialRelations[key].total++;
                    const foreignKey = item[key];
                    if (foreignKey) {
                        const targetCollectionName = FK_RELATIONS[key];
                        const targetCollection = data[targetCollectionName] as any[];
                        if (targetCollection?.some(targetItem => targetItem.id === foreignKey)) {
                            potentialRelations[key].valid++;
                        } else {
                            potentialRelations[key].missing.push(`Fila ${rowIndex} (${item.id || 'sin id'}): ${key} '${foreignKey}' no encontrado en '${targetCollectionName}'.`);
                        }
                    }
                }
            }
        });
        return Object.entries(potentialRelations);
    }, [collectionName, collection, data]);
    if (analysis.length === 0) return <p className="text-sm text-zinc-500">No se detectaron relaciones de clave foránea para esta colección.</p>;
    return (
        <div className="space-y-3">
            {analysis.map(([key, stats]) => (
                <div key={key} className="p-3 rounded-lg border bg-zinc-50/50">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-zinc-800">{key} → {FK_RELATIONS[key]}</span>
                        {stats.total > 0 ? (stats.total === stats.valid ? (<span className="flex items-center gap-1 font-bold text-green-600"><Check size={14}/> {stats.valid}/{stats.total} Válidas</span>) : (<span className="flex items-center gap-1 font-bold text-red-600"><AlertTriangle size={14}/> {stats.valid}/{stats.total} Válidas</span>)) : (<span className="text-xs text-zinc-400"> (No hay datos)</span>)}
                    </div>
                    {stats.missing.length > 0 && (<details className="mt-2 text-xs"><summary className="cursor-pointer text-red-700">Ver {stats.missing.length} IDs no encontrados</summary><ul className="list-disc list-inside pl-2 mt-1 max-h-24 overflow-y-auto">{stats.missing.slice(0, 10).map((err, i) => <li key={i} className="font-mono">{err}</li>)}</ul></details>)}
                </div>
            ))}
        </div>
    );
}

// ===== Import Review Component =====
function ImportReviewerView({ importId }: { importId: string }) {
    const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchStagedItems() {
            try {
                const response = await fetch(`/api/admin/get-staged-import?importId=${importId}`);
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Error al cargar los datos pre-importados.");
                }
                const data = await response.json();
                setStagedItems(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        fetchStagedItems();
    }, [importId]);

    const handleApprove = async () => {
        try {
            const response = await fetch('/api/admin/approve-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ importId }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error al aprobar la importación.');
            }
            alert('¡Importación completada con éxito!');
            router.push('/dev/data-viewer'); // Vuelve al visor normal
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };
    
    const handleDiscard = () => {
        if(confirm('¿Seguro que quieres descartar esta importación? Los datos pre-cargados se perderán.')) {
            router.push('/dev/data-viewer');
        }
    };


    if (loading) return <div className="p-6 text-center">Cargando revisión de importación...</div>;
    if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

    const toCreate = stagedItems.filter(item => item.type === 'create');
    const toUpdate = stagedItems.filter(item => item.type === 'update');

    return (
        <div className="p-6 space-y-6">
             <ModuleHeader title="Revisión de Importación de Holded" icon={FileUp} />
            <p className="text-zinc-600">Revisa los contactos importados de Holded antes de guardarlos definitivamente en el sistema.</p>

            <div className="flex justify-end gap-3">
                <SBButton variant="secondary" onClick={handleDiscard}>Descartar Importación</SBButton>
                <SBButton onClick={handleApprove}>
                    <Check className="mr-2 h-4 w-4" /> Aprobar y Guardar ({stagedItems.length})
                </SBButton>
            </div>

            <SBCard title={`Cuentas Nuevas a Crear (${toCreate.length})`}>
                <div className="divide-y divide-zinc-100">
                    <div className="grid grid-cols-4 gap-4 p-3 bg-zinc-50 text-xs font-semibold uppercase">
                        <span>Nombre</span>
                        <span>CIF</span>
                        <span>Ciudad</span>
                        <span>Teléfono</span>
                    </div>
                    {toCreate.map(item => (
                        <div key={item.id} className="grid grid-cols-4 gap-4 p-3 hover:bg-green-50/50">
                            <div className="font-medium flex items-center gap-2"><PlusCircle size={14} className="text-green-600"/>{item.proposedData.name}</div>
                            <div>{item.proposedData.cif || '—'}</div>
                            <div>{item.proposedData.city || '—'}</div>
                            <div>{item.proposedData.phone || '—'}</div>
                        </div>
                    ))}
                </div>
            </SBCard>

            <SBCard title={`Cuentas Existentes a Actualizar (${toUpdate.length})`}>
                 <div className="divide-y divide-zinc-100">
                    <div className="grid grid-cols-4 gap-4 p-3 bg-zinc-50 text-xs font-semibold uppercase">
                        <span>Nombre</span>
                        <span>CIF</span>
                        <span>Ciudad</span>
                        <span>Teléfono</span>
                    </div>
                    {toUpdate.map(item => (
                        <div key={item.id} className="grid grid-cols-4 gap-4 p-3 hover:bg-yellow-50/50">
                            <div className="font-medium flex items-center gap-2"><RefreshCw size={14} className="text-yellow-700"/>{item.proposedData.name}</div>
                            <div>{item.proposedData.cif || '—'}</div>
                            <div>{item.proposedData.city || '—'}</div>
                            <div>{item.proposedData.phone || '—'}</div>
                        </div>
                    ))}
                </div>
            </SBCard>
        </div>
    );
}


// ===== MAIN PAGE COMPONENT =====
function DataViewerContent() {
    const { data, mode, setData, forceSave } = useData();
    const searchParams = useSearchParams();
    const reviewImportId = searchParams.get('reviewImportId');
    
    const [selectedKey, setSelectedKey] = useState<keyof SantaData>('accounts');
    const [selectedRows, setSelectedRows] = useState(new Set<string>());
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (notification) { const timer = setTimeout(() => setNotification(null), 3000); return () => clearTimeout(timer); } }, [notification]);

    if(reviewImportId){
        return <ImportReviewerView importId={reviewImportId} />;
    }

    if (!data) return <div className="p-6 text-center"><p className="text-lg font-semibold">Cargando datos...</p></div>;

    const dataSummary = Object.keys(data).map(key => ({ key: key as keyof SantaData, count: Array.isArray((data as any)[key]) ? (data as any)[key].length : '-' })).sort((a,b) => a.key.localeCompare(b.key));
    
    const selectedCollection = selectedKey ? (data as any)[selectedKey] : [];

    const handleUpdateRow = (rowIndex: number, newRowData: any) => {
        if (!selectedKey) return;
        const newCollection = [...selectedCollection];
        newCollection[rowIndex] = newRowData;
        setData(prev => prev ? { ...prev, [selectedKey]: newCollection } : null);
        setNotification({ message: 'Fila actualizada localmente. Pulsa "Guardar Cambios" para persistir.', type: 'success' });
    };
    
    const handleSelectRow = (id: string, checked: boolean) => {
        setSelectedRows(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRows(new Set(selectedCollection.map((r: any) => r.id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleDeleteSelected = () => {
        if (selectedRows.size === 0 || !selectedKey) return;
        if (window.confirm(`¿Seguro que quieres eliminar ${selectedRows.size} registros de "${selectedKey}"? Esta acción guardará los cambios inmediatamente.`)) {
            const newCollection = selectedCollection.filter((row: any) => !selectedRows.has(row.id));
            setData(prev => {
                if (!prev) return null;
                const updatedData = { ...prev, [selectedKey]: newCollection };
                forceSave(updatedData).then(() => {
                    setNotification({ message: `${selectedRows.size} registros eliminados permanentemente.`, type: 'success' });
                }).catch(err => {
                    setNotification({ message: `Error al eliminar: ${err.message}`, type: 'error' });
                });
                return updatedData;
            });
            setSelectedRows(new Set());
        }
    };

    const handleExport = (format: 'csv' | 'json') => {
        if (!selectedKey) return;
        const collection = (data as any)[selectedKey] || [];
        if (collection.length === 0) {
            setNotification({ message: 'La colección está vacía, no se puede exportar.', type: 'error' });
            return;
        }

        const filename = `${selectedKey}-${new Date().toISOString().slice(0, 10)}.${format}`;
        let content = '';
        let contentType = '';

        if (format === 'json') {
            content = JSON.stringify(collection, null, 2);
            contentType = 'application/json';
        } else { // csv
            content = Papa.unparse(collection);
            contentType = 'text/csv';
        }

        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setNotification({ message: `Exportando ${filename}`, type: 'success' });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedKey) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const newCollection = [...selectedCollection, ...results.data];
                setData(prev => {
                    if (!prev) return null;
                    const updatedData = { ...prev, [selectedKey]: newCollection };
                     forceSave(updatedData).then(() => {
                        setNotification({ message: `${results.data.length} filas importadas y guardadas en '${selectedKey}'.`, type: 'success' });
                    }).catch(err => {
                        setNotification({ message: `Error al guardar importación: ${err.message}`, type: 'error' });
                    });
                    return updatedData;
                });
            },
            error: (error) => {
                setNotification({ message: `Error al importar: ${error.message}`, type: 'error' });
            }
        });
    };
    
    const handleSaveChanges = () => {
        forceSave().then(() => {
            setNotification({ message: `¡Datos guardados en ${mode === 'real' ? 'Firestore' : 'memoria'}!`, type: 'success' });
        }).catch(err => {
            setNotification({ message: `Error al guardar: ${err.message}`, type: 'error' });
        });
    };

    return (
        <>
            <ModuleHeader title="Visor y Editor de Datos del SSOT" icon={Database}>
                 <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".csv"/>
                    <SBButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={14} /> Importar CSV
                    </SBButton>
                    <SBButton variant="secondary" onClick={() => handleExport('csv')}>
                        <Download size={14} /> Exportar CSV
                    </SBButton>
                    <SBButton variant="secondary" onClick={() => handleExport('json')}>
                        <Download size={14} /> Exportar JSON
                    </SBButton>
                    <SBButton variant="destructive" onClick={handleDeleteSelected} disabled={selectedRows.size === 0}>
                        <Trash2 size={14} /> Eliminar ({selectedRows.size})
                    </SBButton>
                    <SBButton onClick={handleSaveChanges}>
                        <Save size={16}/> Guardar Cambios
                    </SBButton>
                </div>
            </ModuleHeader>
            <div className="p-6">
                {notification && ( <div className={`fixed top-20 right-5 z-50 p-3 rounded-lg shadow-lg text-white text-sm ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{notification.message}</div> )}
                <p className="text-zinc-600 mb-6">
                    Inspecciona, edita, importa o exporta el contenido del `DataProvider`. Modo actual: <strong className="font-semibold text-zinc-800">{mode}</strong>. Los cambios se guardan al pulsar "Guardar", eliminar o importar.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-6 items-start">
                    <div>
                        <SBCard title="Colecciones">
                            <div className="divide-y divide-zinc-100 max-h-[70vh] overflow-y-auto">
                                {dataSummary.map(({ key, count }) => (
                                    <button key={key} onClick={() => { setSelectedKey(key); setSelectedRows(new Set()); }} className={`w-full flex justify-between items-center px-4 py-3 text-sm text-left transition-colors ${selectedKey === key ? 'bg-yellow-50 font-semibold' : 'hover:bg-zinc-50'}`}>
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
                               <TableViewer 
                                 collection={selectedCollection} 
                                 collectionName={selectedKey || ''}
                                 onUpdateRow={handleUpdateRow}
                                 selectedRows={selectedRows}
                                 onSelectRow={handleSelectRow}
                                 onSelectAll={handleSelectAll}
                               />
                            </div>
                        </SBCard>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function DataViewerPage() {
    return (
        <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
            <DataViewerContent />
        </Suspense>
    );
}
