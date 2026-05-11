/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */



"use client";
import React from "react";
import type { ProductionOrder, Interaction } from '@/domain/ssot';
import { SBCard, SBButton, LotQualityStatusPill } from "@/components/ui/ui-primitives";
import { Factory, Cpu, BookOpen, Waypoints, AlertCircle, Hourglass, MoreVertical, Check, X, Thermometer, FlaskConical, Beaker, TestTube2, Paperclip, Upload, Trash2, Calendar, Clock, Building2 } from "lucide-react";
import Link from 'next/link';
import { useData } from '@/lib/dataprovider';
import { DEPT_META } from '@/domain/ssot';

export function KPI({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string | number, color: string }) {
    return (
        <div className="sb-card-glass-light p-4">
            <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color }}>
                    <Icon size={20} />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground mb-1">{label}</p>
                    <p className="text-2xl font-semibold text-foreground">{value}</p>
                </div>
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
        <div className="sb-card-glass-light overflow-hidden">
            <button 
                onClick={() => setOpen(o => !o)} 
                className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-secondary/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-foreground">{title}</span>
                    {typeof count === 'number' && (
                        <span className="sb-kpi-badge">{count}</span>
                    )}
                </div>
                <svg 
                    className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="border-t border-border/40 p-4 space-y-3">{children}</div>}
        </div>
    );
}
