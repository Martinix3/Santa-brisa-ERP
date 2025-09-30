
"use client";
import { useRealtime } from "@/app/providers/RealtimeProvider";
import { Wifi, WifiOff, Zap } from 'lucide-react';

export function RealtimeToggle() {
    const { manualState, cycleManualState } = useRealtime();

    const Icon = manualState === 'on' ? Zap : manualState === 'off' ? WifiOff : Wifi;
    const title = `Estado Realtime: ${manualState.toUpperCase()}`;

    return (
        <button
            onClick={cycleManualState}
            className="p-2 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            title={title}
            aria-label={title}
        >
            <Icon size={18} />
        </button>
    );
}
