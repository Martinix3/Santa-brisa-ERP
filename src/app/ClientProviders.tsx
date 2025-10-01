
"use client";

import { DataProvider } from "@/lib/dataprovider";
import { RealtimeProvider } from "@/app/providers/RealtimeProvider";
import { AssistantProvider } from "./providers/AssistantProvider";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeProvider>
      <DataProvider>
        <AssistantProvider>
          {children}
        </AssistantProvider>
      </DataProvider>
    </RealtimeProvider>
  );
}
