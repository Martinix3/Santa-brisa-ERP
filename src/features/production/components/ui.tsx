

"use client";
import React from "react";
import type { ProductionOrder, Interaction } from '@/domain/ssot';
import { SBCard, SBButton, LotQualityStatusPill } from "@/components/ui/ui-primitives";
import { SB_COLORS, SB_THEME } from '@/domain/ssot';
import { Factory, Cpu, BookOpen, Waypoints, AlertCircle, Hourglass, MoreVertical, Check, X, Thermometer, FlaskConical, Beaker, TestTube2, Paperclip, Upload, Trash2, Calendar, Clock, Building2 } from "lucide-react";
import Link from 'next/link';
import { useData } from '@/lib/dataprovider';
import { DEPT_META } from '@/domain/ssot';

export function KPI({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string | number, color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-sb-neutral-200 flex items-start gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color }}>
                <Icon size={20} className="sb-icon" />
            </div>
            <div>
                <p className="text-2xl font-bold text-sb-neutral-900">{value}</p>
                <p className="text-sm text-sb-neutral-600">{label}</p>
            </div>
        </div>
    )
}

function StatusPill({status}:{status: 'PLANNED'|'RELEASED'|'IN_PROGRESS'|'DONE'|'CANCELLED'}){
  const map:any = {
    PLANNED: { txt:'Planificada', bg:'bg-amber-100 text-amber-800' },
    RELEASED: { txt:'Liberada', bg:'bg-blue-100 text-blue-800' },
    IN_PROGRESS: { txt:'En curso', bg:'bg-blue-100 text-blue-800' },
    DONE: { txt:'Cerrada', bg:'bg-green-100 text-green-800' },
    CANCELLED: { txt:'Cancelada', bg:'bg-red-100 text-red-700' },
  };
  const s = map[status] || map.PLANNED;
  return <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${s.bg}`}>{s.txt}</span>;
}

export function SectionCard({ title, count, defaultOpen = true, children }: {
    title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(defaultOpen);
    return (
        <div className="sb-card border rounded-lg overflow-hidden">
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-3 text-sm font-semibold">
                <div className="flex items-center gap-2">
                    {title}
                    {typeof count === 'number' && (
                        <span className="px-2 py-0.5 text-xs bg-zinc-200 text-zinc-700 rounded-full">{count}</span>
                    )}
                </div>
            </button>
            {open && <div className="border-t p-3 space-y-3">{children}</div>}
        </div>
    );
}
