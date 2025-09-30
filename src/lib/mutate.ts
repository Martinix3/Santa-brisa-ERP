
"use client";
import { toast } from "sonner";
import { useRealtime } from "@/app/providers/RealtimeProvider";

/**
 * Envuelve una server action para:
 * - mostrar toasts
 * - marcar “real-time” (ping)
 * - ejecutar un update optimista opcional
 */
export function useMutate() {
  const { ping } = useRealtime();

  return async function mutate<T>(
    action: () => Promise<{ ok: boolean; id?: string; writtenAtIso?: string } | T>,
    opts: {
      optimistic?: () => void;
      success?: (res: any) => void;
      error?: (err: any) => void;
      label?: string;
    } = {}
  ) {
    try {
      opts.optimistic?.();
      const res: any = await action();
      // estandariza metadatos
      if (res?.writtenAtIso) ping(res.writtenAtIso); else ping();
      if (res?.id) toast.success(`${opts.label ?? "Acción"} OK · id ${res.id}`);
      else toast.success(`${opts.label ?? "Acción"} OK`);
      opts.success?.(res);
      return res;
    } catch (err: any) {
      toast.error(`${opts.label ?? "Acción"} falló: ${err?.message ?? "error"}`);
      opts.error?.(err);
      throw err;
    }
  };
}
