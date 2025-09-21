
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { UploadCloud, Filter, Trash2, Download } from 'lucide-react';
import { SBButton, Input } from '@/components/ui/ui-primitives';

type CsvRow = Record<string, string>;

export function CsvDataViewer() {
    const [data, setData] = useState<CsvRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];

        if (file.type !== 'text/csv') {
            setError('Por favor, sube un archivo CSV válido.');
            return;
        }
        setError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setHeaders(results.meta.fields || []);
                setData(results.data as CsvRow[]);
                setFilters({});
            },
            error: (err) => {
                setError(`Error al procesar el CSV: ${err.message}`);
            }
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

    const handleFilterChange = (header: string, value: string) => {
        setFilters(prev => ({ ...prev, [header]: value }));
    };

    const handleCellChange = (rowIndex: number, header: string, value: string) => {
        setData(prev => {
            const newData = [...prev];
            newData[rowIndex] = { ...newData[rowIndex], [header]: value };
            return newData;
        });
    };

    const handleClear = () => {
        setData([]);
        setHeaders([]);
        setFilters({});
        setError(null);
    };

    const handleDownload = () => {
        const csv = Papa.unparse(filteredData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'edited_data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const filteredData = useMemo(() => {
        return data.filter(row => {
            return headers.every(header => {
                const filterValue = filters[header]?.toLowerCase() || '';
                const rowValue = row[header]?.toLowerCase() || '';
                return rowValue.includes(filterValue);
            });
        });
    }, [data, headers, filters]);


    if (data.length === 0) {
        return (
            <div 
                {...getRootProps()} 
                className={`flex flex-col items-center justify-center p-12 border-4 border-dashed rounded-2xl h-full transition-colors
                ${isDragActive ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
            >
                <input {...getInputProps()} />
                <UploadCloud className="h-16 w-16 text-zinc-400 mb-4" />
                <h3 className="text-xl font-semibold text-zinc-800">Sube un archivo CSV</h3>
                <p className="text-zinc-500 mt-2">Arrastra y suelta un archivo aquí, o haz clic para seleccionarlo.</p>
                {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex-shrink-0 p-3 border-b flex items-center justify-between gap-4">
                <p className="font-semibold text-zinc-800">Editando {filteredData.length} de {data.length} filas</p>
                <div className="flex items-center gap-2">
                    <SBButton variant="secondary" onClick={handleDownload}><Download size={14}/> Exportar CSV</SBButton>
                    <SBButton variant="destructive" onClick={handleClear}><Trash2 size={14}/> Limpiar</SBButton>
                </div>
            </div>
            <div className="flex-grow overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-100 z-10">
                        <tr>
                            {headers.map(header => (
                                <th key={header} className="p-2 border-b border-zinc-200 font-semibold text-left">
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
                            <tr key={rowIndex}>
                                {headers.map(header => (
                                    <td key={header} className="p-0 border-r last:border-r-0">
                                        <Input
                                            value={row[header] || ''}
                                            onChange={e => handleCellChange(data.indexOf(row), header, e.target.value)}
                                            className="w-full h-full rounded-none border-none focus:ring-2 ring-yellow-400 focus:bg-yellow-50"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
