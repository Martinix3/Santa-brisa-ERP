'use client';
import { useFormStatus } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import { SBButton } from "@/components/ui/ui-primitives";

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <SBButton
      type="submit"
      variant="secondary"
      disabled={pending}
    >
      <RefreshCw size={16} className={pending ? 'animate-spin mr-2' : 'mr-2'} />
      {pending ? busy : idle}
    </SBButton>
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
