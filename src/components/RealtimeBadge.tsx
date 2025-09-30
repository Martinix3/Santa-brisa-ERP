
"use client";
import { useRealtime } from "@/app/providers/RealtimeProvider";

export function RealtimeBadge() {
  const { isFresh } = useRealtime();
  if (!isFresh) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs
                     bg-emerald-100 text-emerald-800">
      En tiempo real <span className="size-1.5 rounded-full bg-current animate-pulse" />
    </span>
  );
}
