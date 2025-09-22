
'use client';

import React, { useState, useTransition } from 'react';
import { importShopifyOrder } from '@/app/(app)/orders/actions';
import { SBButton } from '@/components/ui/ui-primitives';
import { Download } from 'lucide-react';

export function ImportShopifyOrderButton() {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const id = orderId.trim();
    if (!id) return setErr('Introduce un ID de pedido de Shopify');

    startTransition(async () => {
      try {
        const saved = await importShopifyOrder(id);
        setMsg(`Importado: ${saved.docNumber || saved.id}`);
        setOrderId('');
        setOpen(false);
      } catch (e: any) {
        setErr(e?.message || 'Error importando el pedido');
      }
    });
  };

  return (
    <>
      <SBButton variant="secondary" onClick={() => setOpen(true)}>
        <Download className="w-4 h-4 mr-2" />
        Importar de Shopify
      </SBButton>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[92vw] max-w-md">
            <h3 className="text-lg font-semibold mb-2">Importar pedido Shopify</h3>
            <p className="text-sm text-zinc-600 mb-4">Pega el <b>orderId</b> numérico de Shopify.</p>
            <form onSubmit={onSubmit} className="space-y-4">
              <input
                autoFocus
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="p.ej. 6891234567890"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-300"
              />
              {err && <div className="text-sm text-red-600">{err}</div>}
              {msg && <div className="text-sm text-green-600">{msg}</div>}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-2 text-sm rounded-md border"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm rounded-md bg-black text-white disabled:opacity-60"
                  disabled={isPending}
                >
                  {isPending ? 'Importando…' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
