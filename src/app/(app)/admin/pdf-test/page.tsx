'use client';
import { useState } from 'react';
import { generateTestPdf } from './actions';
import { SBButton } from "@/components/ui/ui-primitives";

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
      <SBButton
        onClick={run}
        disabled={busy}
        variant="secondary"
      >
        {busy ? 'Generando…' : 'Generar PDF de prueba'}
      </SBButton>

      {uri && (
        <iframe src={uri} className="w-full h-[600px] rounded-lg border" />
      )}
    </div>
  );
}
