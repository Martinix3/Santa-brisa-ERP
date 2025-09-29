
// src/features/accounts/components/AccountPOS.tsx
"use client";
import React from "react";
import { useData } from "@/lib/dataprovider";
import { isSales } from "@/lib/authz";
import { QuickPlacementOrderCard } from "@/features/orders/components/QuickPlacementOrderCard";
import { AccountDevCard } from "./AccountDevCard";

export function AccountPOS({ accountId }:{ accountId:string }) {
  const { currentUser } = useData();
  if (!isSales(currentUser?.role)) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <QuickPlacementOrderCard accountId={accountId} />
      <AccountDevCard accountId={accountId} />
    </div>
  );
}
