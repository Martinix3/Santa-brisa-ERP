
"use client";
import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { OrderStatus, ShipmentStatus } from '@/domain/ssot';
import { SB_COLORS } from '@/domain/ssot';

/*************************************************
 *  Santa Brisa — UI primitives
 *************************************************/
const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

export const STATUS_STYLES: Record<OrderStatus | ShipmentStatus, { label: string; color: string; bg: string }> = {
  // Order Status
  open: { label: 'Borrador', color: 'text-zinc-800', bg: 'bg-zinc-100' },
  confirmed: { label: 'Confirmado', color: 'text-blue-800', bg: 'bg-blue-100' },
  shipped: { label: 'Enviado', color: 'text-cyan-800', bg: 'bg-cyan-100' },
  invoiced: { label: 'Facturado', color: 'text-emerald-800', bg: 'bg-emerald-100' },
  paid: { label: 'Pagado', color: 'text-green-800', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-800', bg: 'bg-red-100' },
  lost: { label: 'Perdido', color: 'text-neutral-600', bg: 'bg-neutral-200' },
  // Shipment Status
  pending: { label: "Pendiente", color: "text-yellow-900", bg: "bg-yellow-100" },
  picking: { label: "Picking", color: "text-sky-900", bg: "bg-sky-100" },
  ready_to_ship: { label: "Validado", color: "text-teal-900", bg: "bg-teal-100" },
  delivered: { label: "Entregado", color: "text-green-900", bg: "bg-green-100" },
};

export { SB_COLORS };

export const hexToRgba = (hex: string, a: number) => {
  if (!hex) return 'rgba(0,0,0,0)';
  const h = hex.replace('#',''); 
  const f = h.length===3? h.split('').map(c=>c+c).join(''):h; 
  const n=parseInt(f,16); 
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255; 
  return `rgba(${r},${g},${b},${a})`; 
};

export const waterHeader = (seed = "hdr", base: string = SB_COLORS.primary.aqua) => {
  const hash = Array.from(seed).reduce((s,c)=> (s*33+c.charCodeAt(0))>>>0,5381);
  let a = hash||1; const rnd = ()=> (a = (a*1664525+1013904223)>>>0, (a>>>8)/16777216);
  const L:string[]=[]; for(let i=0;i<4;i++){ const x=(i%2?80+rnd()*18:rnd()*18).toFixed(2); const y=(rnd()*70+15).toFixed(2); const rx=100+rnd()*120, ry=60+rnd()*120; const a1=0.06+rnd()*0.06, a2=a1*0.5, s1=45+rnd()*10, s2=70+rnd()*12; L.push(`radial-gradient(${rx}px ${ry}px at ${x}% ${y}%, ${hexToRgba(base,a1)}, ${hexToRgba(base,a2)} ${s1}%, rgba(255,255,255,0) ${s2}%)`);} L.push(`linear-gradient(to bottom, ${hexToRgba(base,0.08)}, rgba(255,255,255,0.02))`); return L.join(',');
};

export function AgaveEdge(){ 
  const W=600,H=14; 
  let seed=0xa94f1c2b; 
  const rnd=()=> (seed=(seed*1664525+1013904223)>>>0, (seed>>>8)/16777216); 
  const mk=(dense:boolean)=>{ const arr:any[]=[]; let x=0; while(x<W){ const w=dense?(1+Math.floor(rnd()*2)):(2+Math.floor(rnd()*2)); const h=dense?(4+Math.floor(rnd()*5)):(8+Math.floor(rnd()*7)); const dir=rnd()<0.5?-1:1; const skew=dir*(dense?0.18*h:0.08*h); arr.push({x,w,h,skew}); x+=w; } return arr; }; 
  const back=mk(false), front=mk(true); 
  return (<svg className="h-3 w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden> 
    {back.map((p:any,i:number)=> <polygon key={`b-${i}`} fill="#fff" points={`${p.x},${H} ${p.x+p.w/2+p.skew},${Math.max(0,H-p.h)} ${p.x+p.w},${H}`} />)} 
    {front.map((p:any,i:number)=> <polygon key={`f-${i}`} fill="#fff" points={`${p.x},${H} ${p.x+p.w/2+p.skew},${Math.max(0,H-p.h)} ${p.x+p.w},${H}`} />)} 
  </svg>); 
}

type ButtonProps = {
  variant?: "primary" | "secondary" | "subtle" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  as?: React.ElementType;
} & React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>;


export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    ({ variant = "primary", size = "md", as: Component = "button", className, ...props }, ref) => {
        const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
        const variantMap = {
            primary: "bg-sb-sun text-sb-neutral-900 hover:brightness-110",
            secondary: "border border-zinc-300 bg-white hover:bg-zinc-50",
            subtle: "border border-zinc-200 bg-white hover:bg-zinc-50",
            destructive: "bg-rose-600 text-white hover:bg-rose-700",
            ghost: "hover:bg-zinc-100",
        } as const;
        const sizeMap = {
            sm: "px-2.5 py-1.5 text-xs",
            md: "px-4 py-2 text-sm",
            lg: "px-5 py-2.5 text-base",
        }

        return <Component className={clsx(base, variantMap[variant], sizeMap[size], className)} ref={ref as any} {...props} />;
    }
);
Button.displayName = "Button";


export const Input = (p:React.InputHTMLAttributes<HTMLInputElement>)=> <input {...p} className={clsx("w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 ring-sb-sun", p.className)}/>;
export const Select = (p:React.SelectHTMLAttributes<HTMLSelectElement>)=> <select {...p} className={clsx("w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 ring-sb-sun", p.className)}/>;
export const Textarea = (p:React.TextareaHTMLAttributes<HTMLTextAreaElement>)=> <textarea {...p} rows={4} className={clsx("w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm outline-none focus:ring-2 ring-sb-sun", p.className)}/>;


export function Badge({accent = SB_COLORS.primary.aqua,label}:{accent?:string;label:string}){
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs border" style={{background:hexToRgba(accent,0.12), borderColor:hexToRgba(accent,0.6)}}>{label}</span>;
}

export function Card({title,accent = SB_COLORS.primary.aqua,children}:{title:string;accent?:string;children:React.ReactNode}){
  return <div className="rounded-2xl border border-zinc-200 overflow-hidden bg-white shadow-sm">
    <div className="px-4 py-2.5 border-b relative" style={{background:waterHeader("card:"+title, accent), borderColor:hexToRgba(accent,0.18)}}>
      <div className="text-sm font-medium text-zinc-800">{title}</div>
      <div className="absolute left-0 right-0 -bottom-px"><AgaveEdge/></div>
    </div>
    {children}
  </div>;
}

export const KPI = ({label,value,delta}:{label:string;value:string;delta?:string}) => (
  <div className="rounded-xl border border-zinc-200 p-3 bg-white">
    <div className="text-xs text-zinc-500">{label}</div>
    <div className="text-xl font-semibold text-zinc-900">{value}</div>
    {delta && <div className="text-[11px] text-emerald-600 mt-0.5">{delta}</div>}
  </div>
);

export function Table({cols,rows}:{cols:{key:string;label:string}[]; rows:Record<string,React.ReactNode>[]}){
  return <div className="overflow-auto rounded-xl border border-zinc-200">
    <table className="min-w-[720px] w-full text-sm">
      <thead className="bg-zinc-50">
        <tr>{cols.map(c=> <th key={c.key} className="text-left px-3 py-2 font-medium text-zinc-700">{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r,i)=> (
          <tr key={i} className={i%2? "bg-white":"bg-white"}>
            {cols.map(c=> <td key={c.key} className="px-3 py-2 border-t border-zinc-100">{r[c.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>;
}

export function MiniTrend({data,accent = SB_COLORS.primary.aqua}:{data:{x:string;y:number}[];accent?:string}){
  return <div className="h-32">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{left:8,right:8,top:8,bottom:8}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="x" hide/><YAxis hide/>
        <Tooltip />
        <Line type="monotone" dataKey="y" stroke={accent} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

export const EmptyState = ({icon:Icon,title,desc,action}:{icon:any; title:string; desc:string; action?:React.ReactNode})=> (
  <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl">
    <Icon className="h-6 w-6 mx-auto text-zinc-500"/>
    <div className="mt-2 text-zinc-900 font-medium">{title}</div>
    <div className="text-sm text-zinc-600">{desc}</div>
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export type Col<T> = { key: keyof T | 'actions' | string; header: string; className?:string; render?: (row:T)=>React.ReactNode };

export function DataTableSB<T extends { id:string }>({ rows, cols }:{ rows:T[]; cols:Col<T>[] }){
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const gridTemplateColumns = useMemo(() => {
    return cols.map(() => 'minmax(0, 1fr)').join(' ');
  }, [cols]);
  
  return (
    <div className="bg-white">
      <div className="grid text-[11px] uppercase tracking-wide text-sb-neutral-500 border-b bg-white" style={{ gridTemplateColumns }}>
        {cols.map((c, i)=> <div key={i} className={clsx('px-3 py-2', c.className)}>{c.header}</div>)}
      </div>
      <div className="divide-y divide-sb-neutral-100">
        {rows.map((r,i)=> (
          <div 
            key={r.id} 
            className="grid items-center hover:bg-sb-neutral-50 relative" 
            style={{ 
                gridTemplateColumns,
                zIndex: hoveredRow === r.id ? 10 : 1,
            }}
            onMouseEnter={() => setHoveredRow(r.id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            {cols.map((c, j)=> (
              <div key={j} className={clsx('px-3 py-2 text-sm text-sb-neutral-800 flex items-center', c.className)}>
                {c.render ? c.render(r) : c.key in r ? String(r[c.key as keyof T]) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LotQualityStatusPill({ status }: { status?: 'hold' | 'release' | 'reject' }) {
    const styles = {
        hold: 'bg-yellow-100 text-yellow-800',
        release: 'bg-green-100 text-green-800',
        reject: 'bg-red-100 text-red-800',
    };
    const s = status || 'hold';
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[s]}`}>
            {s.toUpperCase()}
        </span>
    );
}

export { Card as SBCard };
export { Button as SBButton };
