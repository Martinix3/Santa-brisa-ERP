// src/features/sales/pipeline/components/AccountCard.tsx
"use client";
import React from "react";
import type { PipelineAccount } from "../pipeline.service";
import { Badge, SBButton } from "@/components/ui";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { AlertTriangle, MapPin, Milestone, Truck, User } from "lucide-react";

function RiskBadge({ days }: { days: number }) {
  if (days < 45) return null;
  const severity = days >= 90 ? "destructive" : "secondary";
  return <Badge variant={severity} className="text-xs"><AlertTriangle size={12} className="inline mr-1" /> {days}d</Badge>;
}

function TargetBadge({ target }: { target?: { goal: number; actual: number } }) {
  if (!target || !target.goal) return null;
  const pct = Math.round((target.actual / target.goal) * 100);
  return <Badge variant="default" className="text-xs">{pct}%</Badge>;
}

export function AccountCard({ account, onProgram }: { account: PipelineAccount; onProgram: (accountId: string) => void; }) {
  return (
    <div className="border bg-card rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/accounts/${account.id}`} className="font-semibold text-sm hover:underline">{account.name}</Link>
      <p className="text-xs text-muted-foreground truncate">
        {account.city} {account.zone && `· ${account.zone}`} {account.distributorName && `· ${account.distributorName}`}
      </p>
      
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {account.plvInstalled && <Badge variant="outline" className="text-xs">PLV</Badge>}
        <RiskBadge days={account.riskDays} />
        <TargetBadge target={account.target} />
        {account.isFromOtherDistributor && <Badge variant="outline" className="text-xs">Dist: {account.distributorName}</Badge>}
      </div>

      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
            <Milestone size={12} />
            <span>Últ. acción: {account.lastInteraction?.when ? new Date(account.lastInteraction.when).toLocaleDateString('es-ES') : 'N/A'} ({account.lastInteraction?.kind})</span>
        </div>
        <div className="flex items-center gap-2">
            <User size={12} />
            <span>Por: {account.lastInteraction?.createdById}</span>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <SBButton variant="secondary" size="sm" onClick={() => onProgram(account.id)}>Programar</SBButton>
      </div>
    </div>
  );
}
