
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { UploadCloud, Filter, Trash2, Download, Sheet, Save, Database, Plus } from 'lucide-react';
import { SBButton, Input, Select } from '@/components/ui/ui-primitives';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { useData } from '@/lib/dataprovider';
import { SANTA_DATA_COLLECTIONS, SantaData } from '@/domain/ssot';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

type CsvRow = Record<string, any>;

function CsvDataEditor() {
    const { data: santaData, setData, saveCollection, isPersistenceEnabled } = useData();
    
    const [selectedCollection, setSelectedCollection] = useState<keyof SantaData>('accounts');
    const [data, setDataState] = useState<CsvRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (santaData && selectedCollection) {
            const collectionData = santaData[selectedCollection] as CsvRow[] || [];
            setDataState(collectionData);
            if (collectionData.length > 0) {
                const allKeys = collectionData.reduce((acc, row) => {
                    Object.keys(row).forEach(key => acc.add(key));
                    return acc;
                }, new Set<string>());
                setHeaders(Array.from(allKeys));
            } else {
                setHeaders([]);
            }
        }
    }, [santaData, selectedCollection]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Por favor, sube un archivo CSV válido.');
            return;
        }
        setError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedData = results.data as CsvRow[];
                if (parsedData.length > 0) {
                    const newHeaders = results.meta.fields || [];
                    setDataState(prev => [...prev, ...parsedData]); 
                    setHeaders(prev => Array.from(new Set([...prev, ...newHeaders])));
                    setFilters({});
                }
            },
            error: (err: any) => {
                setError(`Error al procesar el CSV: ${err.message}`);
            }
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
        onDrop, 
        multiple: false,
        noClick: true, // Desactivamos el click en el área de drop para manejarlo con el botón
    });

    const handleFilterChange = (header: string, value: string) => {
        setFilters(prev => ({ ...prev, [header]: value }));
    };

    const handleCellChange = (rowIndex: number, header: string, value: string) => {
        setDataState(prev => {
            const newData = [...prev];
            const originalRowIndex = data.findIndex(row => row === filteredData[rowIndex]);
            if (originalRowIndex !== -1) {
                const updatedRow = { ...newData[originalRowIndex], [header]: value };
                newData[originalRowIndex] = updatedRow;
            }
            return newData;
        });
    };

    const handleClear = () => {
        if(window.confirm('¿Seguro que quieres limpiar todos los datos de la vista actual? Los cambios no guardados se perderán.')){
            setDataState([]);
            setHeaders([]);
            setFilters({});
            setError(null);
        }
    };

    const handleDownload = () => {
        if (filteredData.length === 0) return;
        const csv = Papa.unparse(filteredData);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${selectedCollection}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const handleSaveChanges = async () => {
        if (!isPersistenceEnabled) {
            alert("La persistencia está desactivada. Actívala para guardar cambios en la base de datos.");
            return;
        }
        setSaving(true);
        try {
            await saveCollection(selectedCollection, data);
            alert(`Colección '${selectedCollection}' guardada con éxito.`);
        } catch (e: any) {
            setError(`Error al guardar: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const filteredData = useMemo(() => {
        return data.filter(row => {
            return headers.every(header => {
                const filterValue = filters[header]?.toLowerCase() || '';
                const cellValue = row[header];
                const rowValue = (typeof cellValue === 'string' || typeof cellValue === 'number') ? String(cellValue).toLowerCase() : '';
                return rowValue.includes(filterValue);
            });
        });
    }, [data, headers, filters]);


    return (
        <div className="flex flex-col h-full bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex-shrink-0 p-3 border-b flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Database size={16} className="text-zinc-500" />
                    <Select
                        value={selectedCollection}
                        onChange={e => setSelectedCollection(e.target.value as keyof SantaData)}
                        className="font-semibold"
                    >
                        {SANTA_DATA_COLLECTIONS.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </Select>
                    <p className="font-semibold text-zinc-800">Mostrando {filteredData.length} de {data.length} filas</p>
                </div>
                <div className="flex items-center gap-2">
                    <SBButton variant="secondary" onClick={open}><Plus size={14}/> Añadir desde CSV</SBButton>
                    <SBButton variant="secondary" onClick={handleDownload}><Download size={14}/> Exportar CSV</SBButton>
                    <SBButton onClick={handleSaveChanges} disabled={saving || !isPersistenceEnabled} title={!isPersistenceEnabled ? "Activa la persistencia para guardar" : ""}>
                        <Save size={14}/> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </SBButton>
                </div>
            </div>
            
            <div className="flex-grow overflow-auto" {...getRootProps()}>
                 <input {...getInputProps()} />
                {data.length === 0 ? (
                     <div 
                        className={`flex flex-col items-center justify-center p-12 h-full transition-colors
                        ${isDragActive ? 'border-yellow-400 bg-yellow-50' : 'bg-white'}`}
                    >
                        <UploadCloud className="h-16 w-16 text-zinc-400 mb-4" />
                        <h3 className="text-xl font-semibold text-zinc-800">Colección vacía</h3>
                        <p className="text-zinc-500 mt-2">Puedes arrastrar un archivo CSV aquí para añadir datos a la colección <span className="font-bold">{selectedCollection}</span>.</p>
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-zinc-100 z-10">
                            <tr>
                                {headers.map(header => (
                                    <th key={header} className="p-2 border-b border-r border-zinc-200 font-semibold text-left">
                                        <div className="flex items-center gap-2">
                                            <Filter size={12} className="text-zinc-400" />
                                            <Input
                                                placeholder={`Filtrar ${header}...`}
                                                value={filters[header] || ''}
                                                onChange={e => handleFilterChange(header, e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {filteredData.map((row, rowIndex) => (
                                <tr key={row.id || rowIndex}>
                                    {headers.map(header => (
                                        <td key={header} className="p-0 border-r last:border-r-0">
                                            <Input
                                                value={row[header] || ''}
                                                onChange={e => handleCellChange(rowIndex, header, e.target.value)}
                                                className="w-full h-full rounded-none border-none focus:ring-2 ring-yellow-400 focus:bg-yellow-50"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default function DataEditorPage() {
    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Editor de Datos de la Aplicación" icon={Sheet} />
            <div className="p-6 h-[calc(100vh_-_150px)]">
                <CsvDataEditor />
            </div>
        </AuthenticatedLayout>
    )
}
