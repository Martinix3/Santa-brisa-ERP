
"use client";

import { DataProvider } from "@/lib/dataprovider";
import { RealtimeProvider } from "@/app/providers/RealtimeProvider";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeProvider>
      <DataProvider>
          {children}
      </DataProvider>
    </RealtimeProvider>
  );
}
