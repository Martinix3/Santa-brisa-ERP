'use client';
import { useState } from 'react';
import { generateTestPdf } from './actions';
import { SB_THEME } from "@/domain/ssot";

export default function PdfTestPage() {
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    try {
      setBusy(true);
      const res = await generateTestPdf();
      setUri(res.dataUri);
      // descarga automática
      const a = document.createElement('a');
      a.href = res.dataUri;
      a.download = `albaran-test.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Test de PDF — Albarán CRM</h1>
      <p className="text-sm text-zinc-600">Pulsa el botón y debería descargarse <code>albaran-test.pdf</code>. También verás una previsualización abajo.</p>
      <button
        onClick={run}
        disabled={busy}
        className="sb-btn-primary px-4 py-2 rounded-lg border bg-white hover:bg-zinc-50 disabled:opacity-60"
      >
        {busy ? 'Generando…' : 'Generar PDF de prueba'}
      </button>

      {uri && (
        <iframe src={uri} className="w-full h-[600px] rounded-lg border" />
      )}
    </div>
  );
}
