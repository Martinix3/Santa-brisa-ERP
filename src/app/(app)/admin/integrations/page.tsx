// src/app/(app)/admin/integrations/page.tsx
'use client';
import { useEffect, useState, useTransition } from 'react';
// ... (todos tus imports existentes) ...
import { CheckCircle, AlertTriangle, RefreshCw, Link as LinkIcon, PlugZap, TestTubes, DownloadCloud, UploadCloud, Info, Clock, XCircle, Check, Users, ChevronDown } from 'lucide-react';
import { SB_THEME } from "@/domain/ssot";

type JobRun = {
    id: string;
    kind: string;
    status: 'DONE' | 'FAILED' | 'RETRY';
    finishedAt: string;
    payload: { dryRun?: boolean };
    result?: { count?: number; nextPage?: number, message?: string; processedNames?: string[] }; // <-- Modificado a "processedNames"
    error?: string;
};

function JobRunsReport() {
    const [runs, setRuns] = useState<JobRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRun, setExpandedRun] = useState<string | null>(null); // Para controlar qué informe está expandido

    useEffect(() => {
        const fetchRuns = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/integrations/job-runs');
                const data = await res.json();
                if (data.ok) {
                    setRuns(data.runs);
                }
            } catch (e) {
                console.error("Failed to fetch job runs", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRuns();
        const interval = setInterval(fetchRuns, 10000); // Refresca cada 10 segundos
        return () => clearInterval(interval);
    }, []);
    
    const toggleExpand = (runId: string) => {
        setExpandedRun(prev => (prev === runId ? null : runId));
    };

    if (loading && runs.length === 0) {
        return <div className="text-sm text-zinc-500">Cargando informes de trabajos...</div>;
    }

    if (runs.length === 0) {
        return <div className="text-sm text-zinc-500">No hay trabajos recientes.</div>;
    }

    return (
        <div className="rounded-xl border bg-white mt-6">
            <h3 className="font-medium p-4 border-b">Últimos Trabajos de Importación</h3>
            <div className="divide-y divide-zinc-100">
                {runs.map(run => (
                    <div key={run.id} className="p-3 text-sm">
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                            {run.status === 'DONE' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                            <div>
                                <p className="font-semibold">{run.kind} {run.payload.dryRun ? <span className="text-xs text-amber-600">(Dry Run)</span> : ''}</p>
                                <p className="text-xs text-zinc-500">
                                    {new Date(run.finishedAt).toLocaleString('es-ES')}
                                </p>
                            </div>
                            <div className="text-right">
                               {run.status === 'DONE' && (
                                   <p className="text-green-700">{run.result?.count} registros procesados</p>
                               )}
                               {run.status !== 'DONE' && (
                                   <p className="text-red-700 truncate max-w-xs" title={run.error}>Error: {run.error}</p>
                               )}
                            </div>
                        </div>
                        {run.result?.processedNames && run.result.processedNames.length > 0 && (
                            <div className="mt-2 ml-8">
                                <button onClick={() => toggleExpand(run.id)} className="sb-btn-primary text-xs font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-900">
                                    <ChevronDown size={14} className={`transition-transform ${expandedRun === run.id ? 'rotate-180' : ''}`} />
                                    Mostrar {run.result.processedNames.length} registros procesados
                                </button>
                                {expandedRun === run.id && (
                                    <div className="mt-2 p-2 bg-zinc-50 rounded-md border text-xs h-48 overflow-y-auto">
                                        <ul className="list-disc list-inside text-zinc-600 space-y-1">
                                            {run.result.processedNames.map((name, index) => (
                                                <li key={index}><em>{name}</em></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

type Status = { ok: boolean; details?: any; ping?: string; error?: string };
type AllStatus = { shopify: Status; holded: Status; sendcloud: Status };

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<AllStatus | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const [isPending, startTransition] = useTransition();
  const [dryRun, setDryRun] = useState(true);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  async function load(livePing=false) {
    setLoading(true);
    const res = await fetch(`/api/integrations/status${livePing ? '?live=1' : ''}`, { cache: 'no-store' });
    const json = await res.json();
    setStatus(json);
    setLoading(false);
    setLive(livePing);
  }

  async function test(kind: 'shopify'|'holded'|'sendcloud') {
    setTesting(kind);
    setTestResult(null);
    const res = await fetch('/api/integrations/test', { method: 'POST', body: JSON.stringify({ kind }) });
    const json = await res.json();
    setTesting(null);
    setTestResult({ kind, ...json });
  }

  const handleImport = (scopes: string[]) => {
      startTransition(async () => {
          setImportStatus(`Iniciando importación para: ${scopes.join(', ')}...`);
          try {
              const res = await fetch('/api/integrations/holded/import', {
                  method: 'POST',
                  body: JSON.stringify({ scope: scopes, dryRun }),
              });
              const result = await res.json();
              if (result.ok) {
                  setImportStatus(`✅ ¡Jobs encolados! ${result.enqueued.join(', ')} (${dryRun ? 'dry-run' : 'escritura'})`);
              } else {
                  throw new Error(result.error || "Error desconocido");
              }
          } catch(e: any) {
              setImportStatus(`❌ Error: ${e.message}`);
          }
      });
  };

  useEffect(()=> { load(false); }, []);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlugZap className="w-6 h-6 text-teal-700" />
          <h1 className="text-2xl font-semibold">Integraciones</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(false)}
            className="sb-btn-primary inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
            title="Comprobar variables"
          >
            <RefreshCw className={`w-4 h-4 ${loading && !live ? 'animate-spin' : ''}`} /> Comprobar env
          </button>
          <button
            onClick={() => load(true)}
            className="sb-btn-primary inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
            title="Ping real a APIs"
          >
            <RefreshCw className={`w-4 h-4 ${loading && live ? 'animate-spin' : ''}`} /> Ping en vivo
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <Card
          title="Shopify"
          desc="Pedidos, clientes, fulfillments"
          status={status?.shopify}
          onTest={() => test('shopify')}
          testing={testing === 'shopify'}
          docsUrl="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
        />
        <Card
          title="Holded"
          desc="Facturación y contabilidad"
          status={status?.holded}
          onTest={() => test('holded')}
          testing={testing === 'holded'}
          docsUrl="https://developers.holded.com/"
        >
            <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Importación Inicial</h4>
                    <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                        Dry-run
                    </label>
                </div>
                <div className="flex flex-col gap-2">
                    <button onClick={() => handleImport(['contacts'])} disabled={isPending || !status?.holded.ok} className="sb-btn-primary w-full text-sm inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60">
                        <DownloadCloud className="w-4 h-4" /> Importar Contactos
                    </button>
                     <button onClick={() => handleImport(['purchases'])} disabled={isPending || !status?.holded.ok} className="sb-btn-primary w-full text-sm inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60">
                        <DownloadCloud className="w-4 h-4" /> Importar Compras
                    </button>
                    <button onClick={() => handleImport(['products'])} disabled={isPending || !status?.holded.ok} className="sb-btn-primary w-full text-sm inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60">
                        <DownloadCloud className="w-4 h-4" /> Importar Productos
                    </button>
                </div>
                {importStatus && <p className="text-xs text-zinc-600 bg-zinc-100 p-2 rounded-md"><Info className="w-3 h-3 inline mr-1"/> {importStatus}</p>}
            </div>
        </Card>
        <Card
          title="Sendcloud"
          desc="Etiquetas y tracking"
          status={status?.sendcloud}
          onTest={() => test('sendcloud')}
          testing={testing === 'sendcloud'}
          docsUrl="https://docs.sendcloud.sc/api/v2/"
        />
      </div>

      {testResult && (
        <div className="rounded-xl border p-4 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <TestTubes className="w-5 h-5" />
            <h3 className="font-medium">Resultado de prueba: {testResult.kind}</h3>
          </div>
          <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded-lg">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
      <JobRunsReport />
    </div>
  );
}

function StatusPill({ ok }: { ok?: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
      <CheckCircle className="w-3 h-3" /> Conectado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-xs">
      <AlertTriangle className="w-3 h-3" /> Pendiente
    </span>
  );
}

function Card({
  title, desc, status, onTest, testing, docsUrl, children
}: {
  title: string; desc: string; status?: Status; onTest: ()=>void; testing: boolean; docsUrl: string; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-4 bg-white flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-sm text-gray-600">{desc}</p>
        </div>
        <StatusPill ok={status?.ok} />
      </div>
      {status?.ping && (
        <p className="text-xs text-gray-600">Ping: {status.ping}</p>
      )}
      <div className="text-xs text-gray-600">
        {status?.details && <pre className="bg-gray-50 p-2 rounded">{JSON.stringify(status.details, null, 2)}</pre>}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
          <LinkIcon className="sb-icon w-4 h-4" /> Docs
        </a>
        <button
          onClick={onTest}
          disabled={!status?.ok || testing}
          className="sb-btn-primary inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} /> Probar conexión
        </button>
      </div>
      {children}
    </div>
  );
}