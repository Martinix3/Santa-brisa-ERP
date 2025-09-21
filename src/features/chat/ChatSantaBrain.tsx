'use client';

import { useState } from 'react';
import { runSantaBrainInBrowser } from '@/ai/browser/santaBrainClient';

export default function ChatSantaBrain() {
  const [msg, setMsg] = useState('');
  const [out, setOut] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    try {
      const res = await runSantaBrainInBrowser({
        userId: 'mj@santabrisa.co', // sustituye por auth.currentUser?.uid / email
        threadId: 'dev-thread',
        message: msg,
      });
      setOut(res.text || '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-3 max-w-2xl">
      <h2 className="text-lg font-medium">Santa Brain (DEV · navegador)</h2>
      <textarea
        className="w-full border rounded p-2"
        rows={4}
        placeholder='Ej.: "Registra una visita en Bar Pepe mañana a las 19:00 y si confirma crea un pedido de 6x SB-750 a 14€"'
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
      />
      <button
        className="px-3 py-2 rounded bg-yellow-300 hover:bg-yellow-400 disabled:opacity-50"
        onClick={send}
        disabled={loading || !msg.trim()}
      >
        {loading ? 'Pensando…' : 'Enviar'}
      </button>
      <pre className="whitespace-pre-wrap border rounded p-3 bg-white/50">{out}</pre>
    </div>
  );
}
