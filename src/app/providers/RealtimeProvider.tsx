"use client";
import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type RealtimeCtx = {
  lastWriteIso: string | null;
  ping: (iso?: string) => void;     // marca “hubo write”
};

const Ctx = createContext<RealtimeCtx | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [lastWriteIso, setLastWriteIso] = useState<string | null>(null);
  const ping = (iso?: string) => setLastWriteIso(iso ?? new Date().toISOString());

  const value = useMemo(() => ({ lastWriteIso, ping }), [lastWriteIso]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealtime() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRealtime must be used within RealtimeProvider");
  const isFresh = v.lastWriteIso ? (Date.now() - Date.parse(v.lastWriteIso)) < 5000 : false;
  return { ...v, isFresh };
}
