'use client';
import { useFormStatus } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import { SB_THEME } from "@/domain/ssot";

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="sb-btn-primary inline-flex items-center gap-2 border rounded-lg px-3 py-2 hover:bg-zinc-50"
      disabled={pending}
    >
      <RefreshCw size={16} className={pending ? 'animate-spin' : ''} />
      {pending ? busy : idle}
    </button>
  );
}

export function PullButton({ action }: { action: (fd: FormData) => Promise<any> }) {
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="since" value="" />
      <Submit idle="Pull Holded" busy="Sincronizando…" />
    </form>
  );
}
