
// src/features/influencers/components/StatusPill.tsx
"use client";
import React from "react";
import type { CollabStatus } from "@/domain/ssot";
export function StatusPill({ status }:{ status: CollabStatus }) {
  const map:Record<CollabStatus, string>={ PROSPECT:'bg-zinc-100 text-zinc-700', OUTREACH:'bg-blue-100 text-blue-700', NEGOTIATING:'bg-yellow-100 text-yellow-800', AGREED:'bg-purple-100 text-purple-800', LIVE:'bg-green-100 text-green-800 animate-pulse', COMPLETED:'bg-green-100 text-green-800', PAUSED:'bg-gray-100 text-gray-600', DECLINED:'bg-red-100 text-red-700' };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${map[status]}`}>{status}</span>;
}
