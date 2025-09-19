
"use client";

import { DataProvider } from "@/lib/dataprovider";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <DataProvider>
          {children}
      </DataProvider>
  );
}
