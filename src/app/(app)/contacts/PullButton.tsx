'use client';
import { useFormStatus } from 'react-dom';
import { RefreshCw } from 'lucide-react';

function Submit({ labelIdle, labelBusy }: { labelIdle: string; labelBusy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 border rounded-lg px-3 py-2"
      disabled={pending}
    >
      <RefreshCw size={16} className={pending ? 'animate-spin' : ''}/>
      {pending ? labelBusy : labelIdle}
    </button>
  );
}

export function PullButton({ action }: { action: (fd: FormData) => Promise<any> }) {
  return (
    <form action={action} className="flex items-center gap-2">
      {/* Si no quieres filtrar por fecha, deja el input vacío */}
      <input type="hidden" name="since" value="" />
      <Submit labelIdle="Pull Holded" labelBusy="Sincronizando…" />
    </form>
  );
}