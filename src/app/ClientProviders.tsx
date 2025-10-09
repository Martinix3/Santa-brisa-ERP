
"use client";

import { DataProvider } from "@/lib/dataprovider";
import { RealtimeProvider } from "@/app/providers/RealtimeProvider";
import { TraceProvider, TraceModeToggle, TraceOverlay, TraceInspector } from "@/features/trace";
import QuickLogOverlay from "@/features/quicklog/QuickLogOverlay";
import { DevUserSwitcher } from "@/components/dev/DevUserSwitcher";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeProvider>
      <DataProvider>
        <TraceProvider>
          {children}
          {/* QuickLog Button - Always visible */}
          <QuickLogOverlay />
          {/* Dev User Switcher - Only in development */}
          <DevUserSwitcher />
          {/* Modo Traza UI - DESACTIVADO */}
          {false && process.env.NODE_ENV === 'development' && (
            <>
              <TraceModeToggle />
              <TraceOverlay />
              <TraceInspector />
            </>
          )}
        </TraceProvider>
      </DataProvider>
    </RealtimeProvider>
  );
}
