// src/app/(app)/admin/data-import/page.tsx
"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, AlertTriangle, CheckCircle, Info, Download, Trash2, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { importPreview, importCommit } from './actions';
import type { ImportResult, StagedImportItem } from './actions';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { SANTA_DATA_COLLECTIONS } from '@/domain';
import { useData } from '@/lib/dataprovider';

const collectionOptions = (SANTA_DATA_COLLECTIONS as string[])
  .filter(c => !['partyRoles', 'codeAliases'].includes(c))
  .sort();

export default function DataImportPage() {
  const [csvColl, setCsvColl] = useState<string>('accounts');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const { reloadData } = useData() as any;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      handlePreview(acceptedFiles[0]);
    }
  }, [csvColl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handlePreview = async (selectedFile: File) => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      try {
        const result = await importPreview({ collection: csvColl, csvText });
        if (result.error) {
          setError(result.error);
        } else {
          setPreview(result);
        }
      } catch (err: any) {
        setError(err.message || 'Error desconocido en el servidor.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleCommit = async () => {
    if (!preview || !preview.staged) return;
    setCommitLoading(true);
    setError(null);
    try {
        const result = await importCommit({ stagedItems: preview.staged });
        if(result.error){
            setError(result.error);
        } else {
            alert(`¡Importación completada! ${result.committedCount} documentos guardados.`);
            setFile(null);
            setPreview(null);
            if (reloadData) reloadData();
        }
    } catch(err: any) {
        setError(err.message || "Error al confirmar la importación.");
    } finally {
        setCommitLoading(false);
    }
  };
  
  const handleRemoveFile = () => {
      setFile(null);
      setPreview(null);
      setError(null);
  };

  return (
    <>
      <ModuleHeader title="Importación de Datos" icon={UploadCloud} />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <SBCard title="Paso 1: Seleccionar Colección y Subir CSV">
          <div className="p-4 grid md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <label htmlFor="collection-select" className="text-sm font-medium text-zinc-700 block mb-1">
                  Colección de destino
                </label>
                <select
                  id="collection-select"
                  value={csvColl}
                  onChange={(e) => setCsvColl(e.target.value)}
                  className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  {collectionOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <a
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-zinc-50 hover:bg-zinc-100 text-sm"
                  href={`/api/csv-template?collection=${csvColl || 'accounts'}`}
                >
                  <Download size={14} /> Descargar plantilla CSV
                </a>
                 <a
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 hover:bg-blue-100 text-blue-800 text-sm"
                  href={`/api/csv-template?format=zip`}
                >
                  <Download size={14} /> Descargar ZIP
                </a>
              </div>
            </div>
            
            <div {...getRootProps()} className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${isDragActive ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-300 hover:border-yellow-400'}`}>
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-10 w-10 text-zinc-400 mb-2" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                    <File size={16} />
                    <span className="font-medium">{file.name}</span>
                     <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }} className="p-1 rounded-full hover:bg-red-100 text-red-500">
                        <Trash2 size={14}/>
                    </button>
                </div>
              ) : (
                <p>Arrastra un archivo CSV aquí, o haz click para seleccionar</p>
              )}
            </div>
          </div>
        </SBCard>

        {(loading || error || preview) && (
            <SBCard title="Paso 2: Previsualización y Confirmación">
                <div className="p-4">
                    {loading && (
                        <div className="flex items-center justify-center gap-3 text-zinc-600 p-8">
                            <Loader2 className="animate-spin h-6 w-6"/>
                            <span>Analizando el archivo...</span>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                            <h3 className="font-bold flex items-center gap-2"><AlertTriangle size={16}/> Error en la previsualización</h3>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    )}
                    {preview && (
                        <div className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-800">{preview.summary.new}</p>
                                    <p className="text-sm font-medium text-blue-700">Nuevos a crear</p>
                                </div>
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-2xl font-bold text-green-800">{preview.summary.updated}</p>
                                    <p className="text-sm font-medium text-green-700">Existentes a actualizar</p>
                                </div>
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-2xl font-bold text-yellow-800">{preview.summary.warnings}</p>
                                    <p className="text-sm font-medium text-yellow-700">Advertencias</p>
                                </div>
                            </div>

                            {preview.staged && preview.staged.length > 0 && (
                                <div className="max-h-80 overflow-y-auto border rounded-lg">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-zinc-100">
                                            <tr>
                                                <th className="p-2 text-left">Acción</th>
                                                <th className="p-2 text-left">ID / Nombre</th>
                                                <th className="p-2 text-left">Resumen de Cambios</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {preview.staged.map(item => (
                                                <tr key={item.key}>
                                                    <td className="p-2">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${item.action === 'create' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                            {item.action === 'create' ? <Plus size={12}/> : <CheckCircle size={12}/>}
                                                            {item.action}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 font-mono">{item.key}</td>
                                                    <td className="p-2">
                                                        <p className="truncate">{item.description}</p>
                                                        {item.warnings.map((w, i) => (
                                                            <p key={i} className="text-yellow-700 flex items-center gap-1"><Info size={12}/>{w}</p>
                                                        ))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <SBButton onClick={handleCommit} disabled={commitLoading}>
                                    {commitLoading ? <Loader2 className="animate-spin"/> : <CheckCircle size={16}/>}
                                    Confirmar e Importar {preview.summary.new + preview.summary.updated} Documentos
                                </SBButton>
                            </div>
                        </div>
                    )}
                </div>
            </SBCard>
        )}

      </div>
    </>
  );
}
