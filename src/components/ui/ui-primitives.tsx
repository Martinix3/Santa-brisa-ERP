// src/components/ui/ui-primitives.tsx
"use client";
import React from 'react';
import type { Lot } from '@/domain/ssot';

// ===================================
// Tarjeta Genérica (Card)
// ===================================

interface SBCardProps {
  title: string;
  accent?: string;
  children: React.ReactNode;
}

export function SBCard({ title, accent, children }: SBCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
      {title && (
        <div className="p-4 border-b border-zinc-200">
          <h3 className="font-semibold text-zinc-800" style={{ borderLeft: accent ? `3px solid ${accent}` : undefined, paddingLeft: accent ? '8px' : '0' }}>
            {title}
          </h3>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

// ===================================
// Botón Genérico (Button)
// ===================================

interface SBButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'subtle';
    size?: 'sm' | 'md' | 'lg';
    as?: 'button' | 'a';
}

export const SBButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, SBButtonProps>(
    ({ className, variant = 'primary', size = 'md', as = 'button', ...props }, ref) => {
        const Comp = as;
        const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
        
        const variants: Record<string, string> = {
            primary: "bg-zinc-900 text-white hover:bg-zinc-800",
            secondary: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border border-zinc-200",
            destructive: "bg-red-500 text-white hover:bg-red-600",
            ghost: "hover:bg-zinc-100 hover:text-zinc-900",
            subtle: "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
        };
        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-9 px-4",
            lg: "h-10 px-6",
        };

        return <Comp className={`${base} ${variants[variant]} ${sizes[size]} ${className || ''}`} ref={ref as any} {...props} />;
    }
);
SBButton.displayName = "SBButton";


// ===================================
// KPI Display
// ===================================
export function KPI({ label, value, icon: Icon, delta, hint, unit, color }: { label: string; value: string | number; icon?: React.ElementType; delta?: string; hint?: string; unit?:string, color?: string }) {
  const trend = delta ? (delta.startsWith('+') ? 'up' : (delta.startsWith('-') ? 'down' : 'neutral')) : 'neutral';
  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 flex-grow">
        {Icon && <div className="p-2 rounded-lg inline-block mb-2" style={{ backgroundColor: color ? `${color}20` : '#f4f4f5', color: color || '#52525b' }}><Icon className="h-5 w-5" /></div>}
        <p className="text-xs text-zinc-500">{label}</p>
        <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-zinc-900">{value}{unit && <span className="text-zinc-500 text-sm ml-1">{unit}</span>}</p>
            {delta && <span className={`text-xs font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{delta}</span>}
        </div>
        {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

// ===================================
// Lot Quality Status Pill
// ===================================
export function LotQualityStatusPill({ status }: { status?: 'hold' | 'release' | 'reject' }) {
    const map = {
        hold: 'bg-yellow-100 text-yellow-800',
        release: 'bg-green-100 text-green-800',
        reject: 'bg-red-100 text-red-800',
    };
    const s = status || 'hold';
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${map[s]}`}>{s}</span>;
}


// ===================================
// Form Controls
// ===================================

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input ref={ref} className={`h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 ${className || ''}`} {...props} />
    )
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, ...props }, ref) => (
         <select ref={ref} className={`h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 ${className || ''}`} {...props} />
    )
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => (
         <textarea ref={ref} className={`w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 ${className || ''}`} {...props} />
    )
);
Textarea.displayName = 'Textarea';

// ===================================
// DataTable (Simplified)
// ===================================
export type Col<T> = {
    key: keyof T | (string & {});
    header: string;
    className?: string;
    render?: (row: T) => React.ReactNode;
};

export function DataTableSB<T extends { id: string }>({ rows, cols }: { rows: T[], cols: Col<T>[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left bg-zinc-50">
                        {cols.map(c => <th key={String(c.key)} className="p-3 font-semibold text-zinc-600">{c.header}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {rows.map(row => (
                        <tr key={row.id} className="hover:bg-zinc-50/50">
                            {cols.map(c => (
                                <td key={String(c.key)} className={`p-3 ${c.className || ''}`}>
                                    {c.render ? c.render(row) : String(row[c.key as keyof T] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ===================================
// Misc
// ===================================
export const hexToRgba = (hex: string, a: number) => {
  if (!hex) return 'rgba(0,0,0,0)';
  const h = hex.replace('#',''); 
  const f = h.length===3? h.split('').map(c=>c+c).join(''):h; 
  const n=parseInt(f,16); 
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255; 
  return `rgba(${r},${g},${b},${a})`; 
};

export const waterHeader = (seed = "hdr", base = "#A7D8D9") => {
  const hash = Array.from(seed).reduce((s,c)=> (s*33+c.charCodeAt(0))>>>0,5381);
  let a = hash||1; const rnd = ()=> (a = (a*1664525+1013904223)>>>0, (a>>>8)/16777216);
  const L:string[]=[]; for(let i=0;i<3;i++){ const x=(i%2?80+rnd()*18:rnd()*18).toFixed(2); const y=(rnd()*70+15).toFixed(2); const rx=90+rnd()*120, ry=60+rnd()*120; const a1=0.06+rnd()*0.06, a2=a1*0.5, s1=45+rnd()*10, s2=70+rnd()*12; L.push(`radial-gradient(${rx}px ${ry}px at ${x}% ${y}%, ${hexToRgba(base,a1)}, ${hexToRgba(base,a2)} ${s1}%, rgba(255,255,255,0) ${s2}%)`);} L.push(`linear-gradient(to bottom, ${hexToRgba(base,0.08)}, rgba(255,255,255,0.02))`); return L.join(',');
};

export function AgaveEdge(){
  const H = 14;
  return (
    <svg className="h-3 w-full" viewBox={`0 0 600 14`} preserveAspectRatio="none" aria-hidden>
        <polygon fill="#fff" points="0,14 25.8,5.1 51.6,14 77.4,6 103.2,14 129,4.2 154.8,14 180.6,7.7 206.4,14 232.2,4.9 258,14 283.8,6.3 309.6,14 335.4,3.5 361.2,14 387,5.6 412.8,14 438.6,7 464.4,14 490.2,4.2 516,14 541.8,6.3 567.6,14 593.4,2.8 600,14" />
        <polygon fill="#fff" points="0,14 20,4.8 40,14 60,5.7 80,14 100,4.5 120,14 140,7.2 160,14 180,5.1 200,14 220,6.6 240,14 260,4.2 280,14 300,5.4 320,14 340,3.9 360,14 380,5.7 400,14 420,7.5 440,14 460,4.8 480,14 500,6.6 520,14 540,3.3 560,14 580,5.7 600,14" />
    </svg>
  );
}

export const STATUS_STYLES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending: { label: "Pendiente", bg: "bg-yellow-50", color: "text-yellow-800", border: "border-yellow-200" },
  picking: { label: "Picking", bg: "bg-blue-50", color: "text-blue-800", border: "border-blue-200" },
  ready_to_ship: { label: "Validado", bg: "bg-indigo-50", color: "text-indigo-800", border: "border-indigo-200" },
  shipped: { label: "Enviado", bg: "bg-cyan-50", color: "text-cyan-800", border: "border-cyan-200" },
  delivered: { label: "Entregado", bg: "bg-green-50", color: "text-green-800", border: "border-green-200" },
  cancelled: { label: "Cancelado", bg: "bg-zinc-100", color: "text-zinc-600", border: "border-zinc-200" },
};
