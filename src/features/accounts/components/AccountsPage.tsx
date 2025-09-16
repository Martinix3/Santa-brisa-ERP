
"use client"
import React, { useMemo, useState, useEffect } from 'react'
import { ChevronDown, Search, Plus, Phone, Mail, MessageSquare, Calendar, History, ShoppingCart, Info, BarChart3, UserPlus, Users } from 'lucide-react'
import type { Account as AccountType, Stage, User, Distributor, Interaction, OrderSellOut, InteractionKind, SantaData } from '@/domain/ssot'
import { orderTotal } from '@/domain/ssot'
import { accountOwnerDisplay, computeAccountKPIs } from '@/lib/sb-core';
import Link from 'next/link'
import { useData } from '@/lib/dataprovider'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { SB_COLORS } from '@/components/ui/ui-primitives'

const T = { primary:'#618E8F' }
const STAGE: Record<string, { label:string; tint:string; text:string }> = {
  ACTIVA: { label:'Activas', tint:'#A7D8D9', text:'#17383a' },
  SEGUIMIENTO: { label:'En seguimiento', tint:'#F7D15F', text:'#3f3414' },
  POTENCIAL: { label:'Potenciales', tint:'#D7713E', text:'#40210f' },
  FALLIDA: { label:'Perdidas', tint:'#618E8F', text:'#153235' },
}
const formatEUR = (n:number)=> new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)

function Avatar({ name }: { name?: string }) {
  function stringToColor(seed: string) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue} 40% 85%)`;
  }
  const initials = (name || '—')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() || '')
    .join('');
  return (
    <span
      className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] text-zinc-700 border"
      style={{ background: stringToColor(name || '-'), borderColor: '#e5e7eb' }}
    >
      {initials || '—'}
    </span>
  );
}

function GroupBar({stage,count,onToggle,expanded}:{stage:keyof typeof STAGE; count:number; onToggle:()=>void; expanded:boolean}){
  const s = STAGE[stage]
  return (
    <button onClick={onToggle} className="w-full text-left rounded-md overflow-hidden shadow-sm transition-shadow hover:shadow-md" aria-expanded={expanded}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: `linear-gradient(90deg, ${s.tint}33 0, ${s.tint}1a 60%, transparent 100%)` }}>
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{background:s.tint}}/>
          <span className="font-medium" style={{color:s.text}}>{s.label}</span>
          <span className="text-xs text-zinc-700">{count}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-zinc-700 transition-transform duration-300" style={{transform: expanded? 'rotate(180deg)':'rotate(0deg)'}}/>
      </div>
    </button>
  )
}

function AccountBar({ a, santaData }:{ a: AccountType, santaData: SantaData }){
  const [open, setOpen] = useState(false);
  const s = STAGE[a.stage as keyof typeof STAGE] ?? STAGE.ACTIVA;
  const owner = accountOwnerDisplay(a, santaData.users, santaData.distributors);
  const orderAmount = useMemo(()=> (santaData.ordersSellOut || []).filter((o: OrderSellOut)=>o.accountId===a.id).reduce((n: number,o: OrderSellOut)=> n+orderTotal(o),0), [a.id, santaData.ordersSellOut]);
  
  const { unifiedActivity, kpis } = useMemo(() => {
    if (!santaData) return { unifiedActivity: [], kpis: null };
    const interactions = santaData.interactions.filter((i: Interaction) => i.accountId === a.id);
    const orders = santaData.ordersSellOut.filter((o: OrderSellOut) => o.accountId === a.id);

    const unified = [
        ...interactions.map((i: Interaction) => ({ type: 'interaction' as const, date: i.createdAt, data: i })),
        ...orders.map((o: OrderSellOut) => ({ type: 'order' as const, date: o.createdAt, data: o }))
    ];
    unified.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);
    const kpiData = computeAccountKPIs({
        data: santaData,
        accountId: a.id,
        startIso: startDate.toISOString(),
        endIso: endDate.toISOString()
    });

    return { unifiedActivity: unified, kpis: kpiData };
  }, [a.id, santaData]);
  
  const interactionIcons: Record<InteractionKind, React.ElementType> = {
      VISITA: MessageSquare,
      LLAMADA: Phone,
      EMAIL: Mail,
      OTRO: History,
      WHATSAPP: MessageSquare,
  };

  return (
    <div className="overflow-hidden transition-all duration-200 hover:bg-black/5 rounded-lg border border-zinc-200/50">
      <div className="w-full grid grid-cols-[1.6fr_1.2fr_1fr_1.2fr_auto] items-center gap-3 px-4 py-1.5 cursor-pointer" onClick={()=>setOpen(v=>!v)}>
        <div className="text-sm font-medium truncate flex items-center gap-2">
           <button onClick={(e)=>{ e.stopPropagation(); setOpen(v=>!v); }} className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100/20" title={open ? 'Cerrar detalle' : 'Ver detalle'}>
            <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{transform: open? 'rotate(180deg)':'rotate(0deg)'}}/>
          </button>
          <Link href={`/accounts/${a.id}`} className="text-zinc-900 hover:underline truncate">{a.name}</Link>
          {orderAmount>0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 whitespace-nowrap">{formatEUR(orderAmount)}</span>}
        </div>
        <div className="flex items-center gap-2 min-w-0"><Avatar name={owner}/><span className="text-sm text-zinc-700 truncate">{owner}</span></div>
        <div className="text-sm text-zinc-700 truncate">{a.city||'—'}</div>
        <div className="text-sm text-zinc-700 truncate">{a.distributorId? santaData.distributors.find((d: Distributor)=>d.id===a.distributorId)?.name : 'Propia'}</div>
        <div className="text-right" onClick={(e) => { e.stopPropagation(); /* onAddActivityClick(); */ }}>
          <button className="p-1.5 rounded-md border border-zinc-200 bg-white/50 text-zinc-700 inline-flex items-center transition-all hover:bg-white/90 hover:border-zinc-300 hover:scale-105" title="Nueva actividad">
            <Plus className="h-3.5 w-3.5"/>
          </button>
        </div>
      </div>
      {open && kpis && (
        <div className="border-t bg-white/50" style={{borderColor:`${s.tint}33`}}>
            <div className="p-4 grid grid-cols-3 gap-6">
              <div className='col-span-2'>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Actividad Reciente</h4>
                <ul className="space-y-1 text-sm text-zinc-700 max-h-40 overflow-y-auto pr-2">
                    {unifiedActivity.length > 0 ? unifiedActivity.slice(0, 5).map((act, i) => {
                       if (act.type === 'interaction') {
                          const int = act.data as Interaction;
                          const Icon = interactionIcons[int.kind] || History;
                          return (
                               <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                                  <Icon className="h-4 w-4 mt-0.5 text-zinc-500 flex-shrink-0" />
                                  <div>
                                      <span className="font-medium text-zinc-800 capitalize">{int.kind}</span>
                                      <span className="text-zinc-500"> &middot; {new Date(int.createdAt).toLocaleDateString('es-ES', {day:'2-digit',month:'short'})}</span>
                                      {int.note && <p className="text-zinc-600 italic mt-0.5">“{int.note}”</p>}
                                  </div>
                               </li>
                          )
                       }
                       if (act.type === 'order') {
                          const order = act.data as OrderSellOut;
                          return (
                            <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                              <ShoppingCart className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-emerald-800">Pedido</span>
                                <span className="text-zinc-500"> &middot; {new Date(order.createdAt).toLocaleDateString('es-ES', {day:'2-digit',month:'short'})}</span>
                                <p className="font-semibold text-zinc-800 mt-0.5">{formatEUR(orderTotal(order))}</p>
                              </div>
                            </li>
                          )
                       }
                       return null;
                    }) : <div className="text-xs text-zinc-500 text-center py-2">No hay actividad registrada.</div>}
                </ul>
              </div>

              <div>
                 <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">KPIs (90d)</h4>
                 {kpis && <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 bg-zinc-100/50 rounded">
                      <div className="font-bold text-base">{formatEUR(kpis.avgTicket)}</div>
                      <div className="text-zinc-600">Ticket Medio</div>
                    </div>
                    <div className="text-center p-2 bg-zinc-100/50 rounded">
                      <div className="font-bold text-base">{kpis.orderCount}</div>
                      <div className="text-zinc-600">Nº Pedidos</div>
                    </div>
                    <div className="text-center p-2 bg-zinc-100/50 rounded">
                      <div className="font-bold text-base">{kpis.visitsCount}</div>
                      <div className="text-zinc-600">Nº Visitas</div>
                    </div>
                     <div className="text-center p-2 bg-zinc-100/50 rounded">
                      <div className="font-bold text-base">{kpis.daysSinceLastOrder ?? '—'}</div>
                      <div className="text-zinc-600">Días s/ Pedido</div>
                    </div>
                 </div>}
              </div>

            </div>
        </div>
      )}
    </div>
  )
}

export function AccountsPageContent() {
  const { data: santaData, setData, currentUser } = useData();
  
  const [q,setQ]=useState('');
  const [expanded,setExpanded] = useState<Record<string,boolean>>({ ACTIVA:true });
  const [fltRep, setFltRep] = useState("");
  const [fltCity, setFltCity] = useState("");
  const [fltDist, setFltDist] = useState("");
  
  const data = santaData?.accounts || [];

  const { repOptions, cityOptions, distOptions } = useMemo(() => {
    if (!santaData || !santaData.users || !santaData.distributors) {
      return { repOptions: [], cityOptions: [], distOptions: [] };
    }
    const reps = new Set<string>();
    const cities = new Set<string>();
    const dists = new Set<string>();
    data.forEach(a => {
      if (a.mode && (a.mode.mode === 'PROPIA_SB' || a.mode.mode === 'COLOCACION')) {
         if ('ownerUserId' in a.mode) reps.add(a.mode.ownerUserId);
      }
      if (a.city) cities.add(a.city);
      if (a.distributorId) dists.add(a.distributorId);
    });
    const repMap = santaData.users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>);
    const distMap = santaData.distributors.reduce((acc, d) => ({ ...acc, [d.id]: d.name }), {} as Record<string, string>);

    return {
      repOptions: Array.from(reps).map(id => ({ value: id, label: repMap[id] || id })).sort((a,b) => a.label.localeCompare(b.label)),
      cityOptions: Array.from(cities).map(c => ({ value: c, label: c })).sort((a,b) => a.label.localeCompare(b.label)),
      distOptions: Array.from(dists).map(id => ({ value: id, label: distMap[id] || id })).sort((a,b) => a.label.localeCompare(b.label)),
    };
  }, [data, santaData]);

  const filtered = useMemo(() => {
    if (!santaData || !santaData.users || !santaData.distributors) return [];
    const s = q.trim().toLowerCase();
    return data.filter(a => {
      const owner = accountOwnerDisplay(a, santaData.users, santaData.distributors);
      const dist = santaData.distributors.find(d => d.id === a.distributorId);
      const distName = dist?.name || (a.distributorId ? '' : 'Propia');
      
      const matchesQuery = !s || [a.name,a.city,a.type,a.stage, owner, distName].some(v=> (v||'').toString().toLowerCase().includes(s));
      
      let matchesRep = !fltRep;
      if (fltRep && a.mode && (a.mode.mode === 'PROPIA_SB' || a.mode.mode === 'COLOCACION')) {
        if ('ownerUserId' in a.mode) matchesRep = a.mode.ownerUserId === fltRep;
      }
      
      const matchesCity = !fltCity || a.city === fltCity;
      const matchesDist = !fltDist || a.distributorId === fltDist;

      return matchesQuery && matchesRep && matchesCity && matchesDist;
    });
  }, [q, data, fltRep, fltCity, fltDist, santaData]);

  const grouped = useMemo(()=>{
    const g: Record<string,AccountType[]> = { ACTIVA:[], SEGUIMIENTO:[], POTENCIAL:[], FALLIDA:[] };
    filtered.forEach(a=> {
        if (a.stage && g[a.stage]) {
            (g[a.stage] as AccountType[]).push(a);
        }
    });
    return g;
  },[filtered]);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem('sb-groups-expanded');
      if (savedState && savedState.trim() && savedState !== 'undefined') {
        setExpanded(JSON.parse(savedState));
      }
    } catch (e) {
      console.error('Failed to parse expanded state from localStorage', e);
      setExpanded({ ACTIVA: true });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sb-groups-expanded', JSON.stringify(expanded));
    } catch (e) {
      console.error('Failed to save expanded state to localStorage', e);
    }
  }, [expanded]);
  
  if (!santaData) {
    return <div className="p-6">Cargando datos...</div>;
  }

  return (
    <>
      <ModuleHeader title="Cuentas" icon={Users} />
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cuenta, comercial, ciudad..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>
          <FilterSelect value={fltRep} onChange={setFltRep} options={repOptions} placeholder="Comercial" />
          <FilterSelect value={fltCity} onChange={setFltCity} options={cityOptions} placeholder="Ciudad" />
          <FilterSelect value={fltDist} onChange={setFltDist} options={distOptions} placeholder="Distribuidor" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-3">
        {(Object.keys(STAGE) as Array<keyof typeof STAGE>).map(k=>{
          const count = grouped[k]?.length || 0;
          const isOpen = !!expanded[k];
          const s = STAGE[k];
          return (
            <div key={k} id={`group-${k}`} className="w-full">
              <GroupBar stage={k} count={count} expanded={isOpen} onToggle={()=> setExpanded(e=> ({...e,[k]:!e[k]})) }/>
              {isOpen && count > 0 && santaData && (
                <div className="rounded-b-md space-y-1 py-2" style={{backgroundColor: `${s.tint}1A`}}>
                  {grouped[k].map(a=> <AccountBar key={a.id} a={a} santaData={santaData} />) }
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
