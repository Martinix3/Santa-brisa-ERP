// ================================================================
// FILE: src/app/(app)/admin/data-import/page.tsx
// PURPOSE: Admin UI to import data via CSV or spreadsheet-like editor
// FEATURES: server actions (preview/commit), CSV templates, FK auto-link,
//           autogeneración de IDs/SKUs en cliente, soporte consigna y muestras
// ================================================================

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { SANTA_DATA_COLLECTIONS, type SantaData, CODE_POLICIES } from "@/domain/ssot";
import { importPreview, importCommit } from "./actions";

// ----------------- helpers (cliente) -----------------
function parseCsv(text: string): { headers: string[]; rows: string[][] }{
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (s:string)=>{ const out:string[]=[]; let cur=""; let q=false; for (let i=0;i<s.length;i++){ const ch=s[i]; if (ch==='"'){ if (q && s[i+1]==='"'){ cur+='"'; i++; } else q=!q; } else if (ch===',' && !q){ out.push(cur); cur=''; } else cur+=ch; } out.push(cur); return out; };
  const headers = split(lines[0]).map(h=>h.trim());
  const rows = lines.slice(1).map(split);
  return { headers, rows };
}
function csvToObjects(headers: string[], rows: string[][]){ return rows.map(r => Object.fromEntries(headers.map((h,i)=>[h, r[i] ?? ""]))); }
const isoNow = () => new Date().toISOString();
function genId(prefix: keyof typeof CODE_POLICIES | 'GEN'){ 
  const now = new Date(); const YYYY = String(now.getFullYear()); const YY = YYYY.slice(2); const MM = String(now.getMonth()+1).padStart(2,'0'); const DD = String(now.getDate()).padStart(2,'0'); const rnd = Math.random().toString(36).slice(2,8).toUpperCase();
  switch(prefix){ case 'ACCOUNT': return `ACC-${rnd}`; case 'PARTY': return `PTY-${rnd}`; case 'PROD_ORDER': return `PO-${YYYY}${MM}-${rnd.slice(0,4)}`; case 'GOODS_RECEIPT': return `GR-${YYYY}${MM}${DD}-${rnd.slice(0,3)}`; case 'SHIPMENT': return `SHP-${YYYY}${MM}${DD}-${rnd.slice(0,3)}`; case 'LOT': return `${YY}${MM}${DD}-GEN-${rnd.slice(0,3)}`; default: return `${prefix}-${rnd}`; }
}
function slugToSKU(name: string){ if (!name) return ''; const cleaned = name.normalize('NFD').replace(/[^\w\s-]/g,'').replace(/\s+/g,' '); const words = cleaned.trim().split(' '); const base = words.map(w=> w.slice(0,3)).join('-'); return base.toUpperCase().replace(/-+/g,'-').slice(0,16) || `SKU-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }

export default function DataImportPage(){
  const [tab, setTab] = useState<'csv'|'sheet'>('csv');
  const [coll, setColl] = useState<keyof SantaData | ''>('');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<any[] | null>(null);
  const [report, setReport] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
            setCsvText(text);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  // Sheet
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [autoId, setAutoId] = useState(true);
  const [autoSku, setAutoSku] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ // cargar cabeceras desde plantilla CSV
    (async()=>{
      if (!coll) { setHeaders([]); setRows([]); return; }
      const res = await fetch(`/api/csv-template?collection=${coll}`);
      const text = await res.text();
      const firstLine = text.split(/\r?\n/)[0] || '';
      const hdrs = firstLine.split(',').map(h=>h.trim()).filter(Boolean);
      setHeaders(hdrs);
      setRows(Array.from({ length: 5 }, ()=> Object.fromEntries(hdrs.map(h=> [h, '']))));
    })();
  }, [coll]);

  // ---------- CSV ----------
  async function doPreviewCSV(){ if (!coll || !csvText) return; const { headers, rows } = parseCsv(csvText); const objs = csvToObjects(headers, rows); const res = await importPreview({ coll, rows: objs }); setPreview(res.sample || objs); }
  async function doCommitCSV(){ if (!coll || !preview) return; const res = await importCommit({ coll, rows: preview }); setReport(`Importados ${res.inserted + res.updated} docs en ${coll}`); }

  // ---------- SHEET ----------
  function setCell(r:number, k:string, v:string){ setRows(prev=>{ const copy=[...prev]; copy[r] = { ...copy[r], [k]: v }; return copy; }); }
  function addRow(){ setRows(prev=> [...prev, Object.fromEntries(headers.map(h=>[h,'']))]); }
  function autoFill(){ setRows(prev => prev.map((r)=>{ const out = { ...r } as any; if (autoId && !out.id){ const pref = coll==='accounts'? 'ACCOUNT' : coll==='goodsReceipts'? 'GOODS_RECEIPT' : coll==='shipments'? 'SHIPMENT' : coll==='productionOrders'? 'PROD_ORDER' : coll==='lots'? 'LOT' : 'GEN'; out.id = genId(pref as any); } if (autoSku && 'sku' in out && !out.sku && out.name) out.sku = slugToSKU(String(out.name)); if ('createdAt' in out && !out.createdAt) out.createdAt = isoNow(); if ('currency' in out && !out.currency) out.currency = 'EUR'; return out; })); }
  async function doPreviewSheet(){ if (!coll) return; const res = await importPreview({ coll, rows }); setPreview(res.sample || rows); }
  async function doCommitSheet(){ if (!coll) return; const res = await importCommit({ coll, rows }); setReport(`Importados ${res.inserted + res.updated} docs en ${coll}`); }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin · Importar datos</h1>
          <p className="text-sm text-zinc-600">CSV, hoja editable, IDs/SKUs automáticos y resolución de FKs en servidor.</p>
        </div>
        <div className="inline-flex rounded-lg border overflow-hidden">
          {(['csv','sheet'] as const).map(t=> (
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm ${tab===t? 'bg-zinc-900 text-white':'bg-white text-zinc-700'}`}>{t.toUpperCase()}</button>
          ))}
        </div>
      </header>

      <div className="flex items-center gap-2">
        <select value={coll} onChange={e=>setColl(e.target.value as keyof SantaData)} className="border rounded px-2 py-1">
          <option value="">Selecciona colección…</option>
          {SANTA_DATA_COLLECTIONS.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        {coll && <a href={`/api/csv-template?collection=${coll}`} className="px-3 py-1 border rounded">Descargar plantilla CSV</a>}
      </div>

      {tab==='csv' && (
        <section className="space-y-3">
          <div
            {...getRootProps()}
            className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-zinc-400" />
            {fileName ? (
              <p className="mt-2 text-sm text-zinc-800 font-medium">Archivo seleccionado: {fileName}</p>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                {isDragActive
                  ? 'Suelta el archivo aquí...'
                  : 'Arrastra un archivo CSV aquí, o haz clic para seleccionarlo'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={doPreviewCSV} className="px-3 py-1 border rounded" disabled={!csvText}>Previsualizar</button>
            <button onClick={doCommitCSV} className="px-3 py-1 border rounded bg-emerald-50" disabled={!preview}>Importar</button>
          </div>
        </section>
      )}

      {tab==='sheet' && (
        <section className="space-y-3">
          {!coll ? (<div className="text-sm text-zinc-600">Elige una colección para empezar.</div>) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={autoId} onChange={e=>setAutoId(e.target.checked)} /> Autogenerar IDs</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={autoSku} onChange={e=>setAutoSku(e.target.checked)} /> Autogenerar SKU desde &quot;name&quot;</label>
                <button className="ml-auto px-3 py-1 border rounded" onClick={addRow}>Añadir fila</button>
                <button className="px-3 py-1 border rounded" onClick={autoFill}>Autocompletar</button>
                <button className="px-3 py-1 border rounded" onClick={doPreviewSheet}>Previsualizar (resolver FKs)</button>
                <button className="px-3 py-1 border rounded bg-emerald-50" onClick={doCommitSheet}>Importar</button>
              </div>

              <div className="rounded border overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-50">{headers.map(h=> <th key={h} className="px-2 py-1 text-left font-medium text-zinc-600 border-r last:border-r-0">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r,ri)=> (
                      <tr key={ri} className="border-t">
                        {headers.map(h=> (
                          <td key={h} className="px-1 py-0.5 border-r last:border-r-0">
                            <input className="w-full px-2 py-1 rounded outline-none" value={r[h] ?? ''} onChange={e=>setCell(ri,h,e.target.value)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {preview && (
        <div className="space-y-2">
          <div className="text-sm text-zinc-600">Preview normalizado (server):</div>
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-zinc-50">{Object.keys(preview[0]||{}).map(h=> <th key={h} className="px-2 py-1 text-left font-medium text-zinc-600 border-r last:border-r-0">{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.map((r,i)=> (
                  <tr key={i} className="border-t">{Object.keys(preview[0]||{}).map(h=> <td key={h} className="px-2 py-1 font-mono border-r last:border-r-0">{String(r[h] ?? '')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report && <div className="text-sm text-emerald-700">{report}</div>}
    </div>
  );
}
