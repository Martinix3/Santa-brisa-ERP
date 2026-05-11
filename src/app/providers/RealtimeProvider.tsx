/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


"use client";
import React, { createContext, useContext, useMemo, useRef, useState, useCallback } from "react";

type ManualState = 'auto' | 'on' | 'off';

type RealtimeCtx = {
  lastWriteIso: string | null;
  ping: (iso?: string) => void;     // marca “hubo write”
  manualState: ManualState;
  cycleManualState: () => void;
};

const Ctx = createContext<RealtimeCtx | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [lastWriteIso, setLastWriteIso] = useState<string | null>(null);
  const [manualState, setManualState] = useState<ManualState>('auto');

  const ping = useCallback((iso?: string) => setLastWriteIso(iso ?? new Date().toISOString()), []);

  const cycleManualState = useCallback(() => {
    setManualState(current => {
        if (current === 'auto') return 'on';
        if (current === 'on') return 'off';
        return 'auto';
    });
  }, []);

  const value = useMemo(() => ({ lastWriteIso, ping, manualState, cycleManualState }), [lastWriteIso, ping, manualState, cycleManualState]);
  
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealtime() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRealtime must be used within RealtimeProvider");

  const { lastWriteIso, manualState } = v;

  const isFresh = useMemo(() => {
    if (manualState === 'on') return true;
    if (manualState === 'off') return false;
    // auto mode
    return lastWriteIso ? (Date.now() - Date.parse(lastWriteIso)) < 5000 : false;
  }, [lastWriteIso, manualState]);
  
  return { ...v, isFresh };
}
