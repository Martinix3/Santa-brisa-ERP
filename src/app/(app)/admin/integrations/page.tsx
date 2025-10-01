
// src/app/(app)/admin/integrations/page.tsx
'use client';
import { useEffect, useState, useTransition } from 'react';
// ... (todos tus imports existentes) ...
import { CheckCircle, AlertTriangle, RefreshCw, Link as LinkIcon, PlugZap, TestTubes, DownloadCloud, UploadCloud, Info, Clock, XCircle, Check, Users, ChevronDown } from 'lucide-react';
import { SBButton, SBCard } from "@/components/ui/ui-primitives";
import { ModuleHeader } from '@/components/ui';

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
        <SBCard title="Últimos Trabajos de Importación" className="mt-6">
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
                                <SBButton variant="ghost" size="sm" onClick={() => toggleExpand(run.id)} className="text-xs font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-900">
                                    <ChevronDown size={14} className={`transition-transform ${expandedRun === run.id ? 'rotate-180' : ''}`} />
                                    Mostrar {run.result.processedNames.length} registros procesados
                                </SBButton>
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
        </SBCard>
    );
}

type Status = { ok: boolean; details?: any; ping?: string; error?: string };
type AllStatus = { shopify: Status; holded: Status; sendcloud: Status };

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

function IntegrationCard({
  title, desc, status, onTest, testing, docsUrl, children
}: {
  title: string; desc: string; status?: Status; onTest: ()=>void; testing: boolean; docsUrl: string; children?: React.ReactNode;
}) {
  return (
    <SBCard title={title} className="flex flex-col">
      <div className="p-4 flex flex-col flex-grow bg-card">
        <div className="flex items-center justify-between">
            <div>
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
        <div className="mt-auto flex items-center justify-between pt-4">
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
            <LinkIcon className="sb-icon w-4 h-4" /> Docs
            </a>
            <SBButton
            variant="secondary"
            onClick={onTest}
            disabled={!status?.ok || testing}
            >
            <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} /> Probar conexión
            </SBButton>
        </div>
      </div>
       {children && <div className="p-4 border-t bg-secondary">{children}</div>}
    </SBCard>
  );
}

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
    <div className="space-y-6">
      <ModuleHeader title="Integraciones" icon={PlugZap} />

      <div className="grid md:grid-cols-3 gap-4">
        <IntegrationCard
          title="Shopify"
          desc="Pedidos, clientes, fulfillments"
          status={status?.shopify}
          onTest={() => test('shopify')}
          testing={testing === 'shopify'}
          docsUrl="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
        />
        <IntegrationCard
          title="Holded"
          desc="Facturación y contabilidad"
          status={status?.holded}
          onTest={() => test('holded')}
          testing={testing === 'holded'}
          docsUrl="https://developers.holded.com/"
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Importación Inicial</h4>
                    <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                        Dry-run
                    </label>
                </div>
                <div className="flex flex-col gap-2">
                    <SBButton variant="secondary" onClick={() => handleImport(['contacts'])} disabled={isPending || !status?.holded.ok}>
                        <DownloadCloud className="w-4 h-4 mr-2" /> Importar Contactos
                    </SBButton>
                     <SBButton variant="secondary" onClick={() => handleImport(['purchases'])} disabled={isPending || !status?.holded.ok}>
                        <DownloadCloud className="w-4 h-4 mr-2" /> Importar Compras
                    </SBButton>
                    <SBButton variant="secondary" onClick={() => handleImport(['products'])} disabled={isPending || !status?.holded.ok}>
                        <DownloadCloud className="w-4 h-4 mr-2" /> Importar Productos
                    </SBButton>
                </div>
                {importStatus && <p className="text-xs text-zinc-600 bg-zinc-100 p-2 rounded-md"><Info className="w-3 h-3 inline mr-1"/> {importStatus}</p>}
            </div>
        </IntegrationCard>
        <IntegrationCard
          title="Sendcloud"
          desc="Etiquetas y tracking"
          status={status?.sendcloud}
          onTest={() => test('sendcloud')}
          testing={testing === 'sendcloud'}
          docsUrl="https://docs.sendcloud.sc/api/v2/"
        />
      </div>

      {testResult && (
        <SBCard title={
            <div className="flex items-center gap-2">
                <TestTubes className="w-5 h-5" />
                <h3 className="font-medium">Resultado de prueba: {testResult.kind}</h3>
            </div>
        }>
          <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded-lg">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </SBCard>
      )}
      <JobRunsReport />
    </div>
  );
}
