"use client";
import React from "react";
import DataProvider from "@/lib/dataprovider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
