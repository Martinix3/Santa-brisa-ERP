
'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, Link as LinkIcon, PlugZap, TestTubes } from 'lucide-react';

type Status = { ok: boolean; details?: any; ping?: string; error?: string };
type AllStatus = { shopify: Status; holded: Status; sendcloud: Status };

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<AllStatus | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
            title="Comprobar variables"
          >
            <RefreshCw className={`w-4 h-4 ${loading && !live ? 'animate-spin' : ''}`} /> Comprobar env
          </button>
          <button
            onClick={() => load(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
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
        />
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

      <p className="text-sm text-gray-600">
        Las credenciales se leen del backend. Este panel nunca expone claves en el cliente.
      </p>
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
  title, desc, status, onTest, testing, docsUrl
}: {
  title: string; desc: string; status?: Status; onTest: ()=>void; testing: boolean; docsUrl: string;
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
          <LinkIcon className="w-4 h-4" /> Docs
        </a>
        <button
          onClick={onTest}
          disabled={!status?.ok || testing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} /> Probar conexión
        </button>
      </div>
    </div>
  );
}
