// src/features/accounts/components/AccountsPage.tsx

"use client"
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, Plus, Phone, Mail, MessageSquare, Calendar, History, ShoppingCart, Info, BarChart3, UserPlus, Users, MoreVertical, Ticket, Clock, Edit, FileText } from 'lucide-react'
import type { AccountStage, Interaction, OrderSellOut, InteractionKind, Account, AccountType, Uom, Party, TeamMember } from '@/domain/ssot'

// Tipos legacy locales (migrar progresivamente)
type Stage = AccountStage;
type CustomerData = { billerId?: string; [key: string]: any };
type PartyRole = { id: string; partyId: string; role: string; data?: any };
type SantaData = { 
  accounts: Account[]; 
  interactions: Interaction[]; 
  ordersSellOut: OrderSellOut[]; 
  parties: Party[]; 
  users: TeamMember[];
  teamMembers: TeamMember[];
  partyRoles: PartyRole[];
  [key: string]: any;
};
import { accountOwnerDisplay, computeAccountKPIs, getDistributorForAccount, orderTotal } from '@/lib/sb-core';
import Link from 'next/link'
import { useData } from '@/lib/dataprovider'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog'
import { Avatar } from '@/components/ui/Avatar';
import { NewAccountDialog } from './NewAccountDialog';
import { DEPT_META, ACCOUNT_STAGE_META } from '@/domain/ssot';
import { toast } from 'sonner';

// Mapa de colores para mantener compatibilidad visual
const STAGE_COLORS: Record<Stage, { tint:string; text:string }> = {
  ACTIVA: { tint:'#A7D8D9', text:'#17383a' },
  SEGUIMIENTO: { tint:'#F7D15F', text:'#3f3414' },
  POTENCIAL: { tint:'#D7713E', text:'#40210f' },
  FALLIDA: { tint:'#618E8F', text:'#153235' },
  CERRADA: { tint:'#9ca3af', text:'#1f2937' },
  BAJA: { tint:'#9ca3af', text:'#1f2937' },
}
const formatEUR = (n:number)=> new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)

function GroupBar({ stage, count, expanded, onToggle }: { stage: Stage, count: number, expanded: boolean, onToggle: () => void }) {
    const meta = ACCOUNT_STAGE_META[stage];
    const colors = STAGE_COLORS[stage];
    if (!meta) return null;
    return (
        <button
            onClick={onToggle}
            className="w-full grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 transition-colors cursor-pointer bg-zinc-50/50"
            aria-expanded={expanded}
            aria-controls={`panel-${stage}`}
            id={`button-${stage}`}
        >
            <div className="flex items-center gap-2 flex-grow">
                <h3 className="font-semibold text-sm" style={{color: colors.text}}>{meta.label}</h3>
                <span className="text-xs font-normal opacity-80" style={{color: colors.text}}>({count})</span>
            </div>
            <ChevronDown
                className="h-5 w-5 transition-transform duration-300"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', color: colors.text }}
                aria-hidden="true"
            />
        </button>
    );
}

function AccountBar({ a, party, santaData, onAddActivity, userMap, shortDate }: { a: Account, party?: Party, santaData: SantaData, onAddActivity: (acc: Account) => void, userMap: Record<string, string>, shortDate: Intl.DateTimeFormat }) {
  const [open, setOpen] = useState(false);
  
  const owner = useMemo(() => accountOwnerDisplay(a, santaData.users, santaData.partyRoles), [a, santaData.users, santaData.partyRoles]);
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
      EVENTO_MKT: MessageSquare,
      COBRO: MessageSquare
  };

  const distributorName = useMemo(() => {
      return getDistributorForAccount(a, santaData.partyRoles, santaData.parties)?.name || 'Propia';
  }, [a, santaData.partyRoles, santaData.parties]);


  return (
    <div
      className="overflow-hidden transition-colors duration-150 hover:bg-black/5"
    >
        <div className="w-full grid grid-cols-[auto_1.6fr_1.2fr_1fr_1.2fr_auto] items-center gap-3 px-4 py-1.5 cursor-pointer" onClick={()=>setOpen(v=>!v)}>
            <div className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100/20">
                <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{transform: open? 'rotate(180deg)':'rotate(0deg)'}} aria-hidden="true"/>
            </div>
            <div className="text-sm font-medium truncate flex items-center gap-2">
                <Link href={`/accounts/${a.id}`} className="text-zinc-900 truncate hover:underline">{a.name}</Link>
                {orderAmount>0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">{formatEUR(orderAmount)}</span>}
            </div>
            <div className="flex items-center gap-2 min-w-0"><Avatar name={owner} size="md" />
                <span className="text-sm text-zinc-700 truncate">{owner}</span>
            </div>
            <div className="text-sm text-zinc-700 truncate">{party?.billingAddress?.city ||'—'}</div>
            <div className="text-sm text-zinc-700 truncate">{distributorName}</div>
            <div className="text-right relative group focus-within:z-10">
                <button className="p-1.5 rounded-md border border-zinc-200 bg-white/50 text-zinc-700 inline-flex items-center transition-all hover:bg-white/90 hover:border-zinc-300 hover:scale-105" title="Acciones">
                    <MoreVertical className="h-3.5 w-3.5"/>
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-md shadow-lg invisible group-hover:visible group-focus-within:visible">
                    <Link href={`/accounts/${a.id}`} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><Info size={14}/> Ver Ficha de Cliente</Link>
                    <button onClick={(e) => { e.stopPropagation(); onAddActivity(a); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><Plus size={14}/> Añadir Actividad</button>
                </div>
            </div>
        </div>
        {open && kpis && (
            <div className="p-4 bg-white shadow-inner">
                <div className="grid grid-cols-3 gap-6">
                    <div className='col-span-2'>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Actividad Reciente</h4>
                        <ul className="space-y-1 text-sm text-zinc-700 max-h-40 overflow-y-auto pr-2">
                            {unifiedActivity.length > 0 ? unifiedActivity.slice(0, 5).map((act, i) => {
                                if (act.type === 'interaction') {
                                    const int = act.data;
                                    const Icon = interactionIcons[int.kind] || History;
                                    return (
                                        <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                                            <Icon className="h-4 w-4 mt-0.5 text-zinc-500 flex-shrink-0" />
                                            <div>
                                                <span className="font-medium text-zinc-800 capitalize">{int.kind}</span>
                                                <span className="text-zinc-500"> &middot; {shortDate.format(new Date(int.createdAt))}</span>
                                                {int.note && <p className="text-zinc-600 italic mt-0.5 line-clamp-2">“{int.note}”</p>}
                                            </div>
                                        </li>
                                    )
                                }
                                if (act.type === 'order') {
                                    const order = act.data;
                                    return (
                                        <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                                            <ShoppingCart className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                                            <div>
                                                <span className="font-medium text-emerald-800">Pedido</span>
                                                <span className="text-zinc-500"> &middot; {shortDate.format(new Date(order.createdAt))}</span>
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
                            <div className="text-center p-2 bg-zinc-100/50 rounded flex flex-col items-center gap-1">
                                <Ticket size={16} className="text-zinc-500"/>
                                <div className="font-bold text-base">{formatEUR(kpis.avgTicket)}</div>
                                <div className="text-zinc-600">Ticket Medio</div>
                            </div>
                            <div className="text-center p-2 bg-zinc-100/50 rounded flex flex-col items-center gap-1">
                                <ShoppingCart size={16} className="text-zinc-500"/>
                                <div className="font-bold text-base">{kpis.orderCount}</div>
                                <div className="text-zinc-600">Nº Pedidos</div>
                            </div>
                            <div className="text-center p-2 bg-zinc-100/50 rounded flex flex-col items-center gap-1">
                                <MessageSquare size={16} className="text-zinc-500"/>
                                <div className="font-bold text-base">{kpis.visitsCount}</div>
                                <div className="text-zinc-600">Nº Visitas</div>
                            </div>
                            <div className="text-center p-2 bg-zinc-100/50 rounded flex flex-col items-center gap-1">
                                <Clock size={16} className="text-zinc-500"/>
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
  const router = useRouter();
  const { data: santaData, setData, currentUser, saveAllCollections } = useData();
  
  const [q,setQ]=useState('');
  const [flowTab, setFlowTab] = useState<'DIRECTA' | 'COLOCACION'>('DIRECTA');
  const [expanded,setExpanded] = useState<Record<string,boolean>>({ ACTIVA:true });
  const [fltRep, setFltRep] = useState("");
  const [fltCity, setFltCity] = useState("");
  const [fltDist, setFltDist] = useState("");
  
  const [completingTaskForAccount, setCompletingTaskForAccount] = useState<Account | null>(null);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = document.getElementById('accounts-search') as HTMLInputElement | null;
        el?.focus();
        e.preventDefault();
      }
      if (e.key === 'Escape') setQ('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const data = useMemo(() => santaData?.accounts || [], [santaData]);

  const { partyMap, userMap, repOptions, cityOptions, distOptions } = useMemo(() => {
    if (!santaData) {
      return { partyMap: {}, userMap: {}, repOptions: [], cityOptions: [], distOptions: [] };
    }
    const pMap: Record<string, Party> = {};
    (santaData.parties || []).forEach(p => { pMap[p.id] = p; });

    const uMap: Record<string, string> = {};
    (santaData.users || []).forEach(u => { uMap[u.id] = u.name; });

    const reps = new Set<string>();
    const cities = new Set<string>();
    
    data.forEach(a => {
      if (a.salesRepId) reps.add(a.salesRepId);
      const party = pMap[a.partyId];
      if (party?.billingAddress?.city) cities.add(party.billingAddress.city);
    });

    const distributorRoles = (santaData.partyRoles || []).filter(r => r.role === 'DISTRIBUTOR');
    
    return {
      partyMap: pMap,
      userMap: uMap,
      repOptions: Array.from(reps).map(id => ({ value: id, label: uMap[id] || pMap[id]?.name || id })).sort((a,b) => a.label.localeCompare(b.label)),
      cityOptions: Array.from(cities).map(c => ({ value: c, label: c })).sort((a,b) => a.label.localeCompare(b.label)),
      distOptions: distributorRoles.map(role => ({ value: role.partyId, label: pMap[role.partyId]?.name || role.partyId })).sort((a,b) => a.label.localeCompare(b.label)),
    };
  }, [data, santaData]);

  const shortDate = useMemo(() => new Intl.DateTimeFormat('es-ES', { day:'2-digit', month:'short' }), []);

  const filtered = useMemo(() => {
    if (!santaData) return [];
    const s = q.trim().toLowerCase();
    
    return data.filter(a => {
      const ownerName = a.salesRepId ? (userMap[a.salesRepId] || '') : '';
      const party = partyMap[a.partyId];
      const city = party?.billingAddress?.city || '';

      const customerRole = (santaData.partyRoles || []).find(pr => pr.partyId === a.partyId && pr.role === 'CUSTOMER');
      const billerId = (customerRole?.data as CustomerData)?.billerId;

      // Normalizar flow: usar flow si existe, sino convertir mode deprecated
      const accountFlow = a.flow || (a.commercialFlow === 'DIRECTA' ? 'DIRECTA' : a.commercialFlow === 'COLOCACION' ? 'COLOCACION' : 'DIRECTA');

      const matchesQuery = !s || [a.name, city, a.type, a.stage, ownerName].some(v=> (v||'').toString().toLowerCase().includes(s));
      const matchesRep = !fltRep || a.salesRepId === fltRep;
      const matchesCity = !fltCity || city === fltCity;
      const matchesDist = !fltDist || billerId === fltDist;
      const matchesFlow = accountFlow === flowTab;

      return matchesQuery && matchesRep && matchesCity && matchesDist && matchesFlow;
    });
  }, [q, data, fltRep, fltCity, fltDist, flowTab, santaData, userMap, partyMap]);

  const grouped = useMemo(()=>{
    const g: Record<string,Account[]> = { ACTIVA:[], SEGUIMIENTO:[], POTENCIAL:[], FALLIDA:[] };
    filtered.forEach(a=> {
        if (a.stage && g[a.stage]) {
            (g[a.stage] as Account[]).push(a);
        }
    });
    return g;
  },[filtered]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const savedState = localStorage.getItem('sb-groups-expanded');
            if (savedState && savedState.trim() && savedState !== 'undefined') {
                setExpanded(JSON.parse(savedState));
            }
        } catch (e) {
            console.error('Failed to parse expanded state from localStorage', e);
            setExpanded({ ACTIVA: true });
        }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('sb-groups-expanded', JSON.stringify(expanded));
        } catch (e) {
            console.error('Failed to save expanded state to localStorage', e);
        }
    }
  }, [expanded]);
  
  if (!santaData) {
    return <div className="p-6">Cargando datos...</div>;
  }

  return (
    <>
      <div className="border-b bg-white">
        <div className="px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" style={{ color: DEPT_META.VENTAS.color }} />
              <h1 className="text-2xl font-bold">Cuentas</h1>
            </div>
            <button onClick={() => setIsNewAccountOpen(true)} className="flex items-center gap-2 text-sm rounded-md px-3 py-1.5 font-semibold transition-colors"
             style={{ backgroundColor: DEPT_META.VENTAS.color, color: DEPT_META.VENTAS.textColor }}>
                <Plus size={16} /> Nueva Cuenta
            </button>
          </div>
          
          {/* Tabs para Venta Directa / Colocación */}
          <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg w-fit">
            <button
              onClick={() => setFlowTab('DIRECTA')}
              className={`h-8 px-4 rounded-md text-sm font-medium transition-colors ${
                flowTab === 'DIRECTA'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Directas
            </button>
            <button
              onClick={() => setFlowTab('COLOCACION')}
              className={`h-8 px-4 rounded-md text-sm font-medium transition-colors ${
                flowTab === 'COLOCACION'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Colocación
            </button>
          </div>
        </div>
      </div>
      
      <div className="w-full px-4 lg:px-8 pt-3 pb-1 sticky top-0 z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              id="accounts-search"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cuenta, comercial, ciudad... (F)"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>
          <FilterSelect value={fltRep} onChange={setFltRep} options={repOptions} placeholder="Comercial" />
          <FilterSelect value={fltCity} onChange={setFltCity} options={cityOptions} placeholder="Ciudad" />
          <FilterSelect value={fltDist} onChange={setFltDist} options={distOptions} placeholder="Distribuidor" />
        </div>
      </div>
      <div className="w-full px-4 md:px-6 pb-6 space-y-3">
        {(Object.keys(ACCOUNT_STAGE_META) as Stage[]).map(k=>{
          const count = grouped[k]?.length || 0;
          const isOpen = !!expanded[k];
          const colors = STAGE_COLORS[k];
          return (
            <div key={k} id={`group-${k}`} className="w-full rounded-lg overflow-hidden"
              style={{
                borderLeft: `4px solid ${colors.tint}`,
                backgroundColor: `${colors.tint}1A`,
              }}
            >
              <GroupBar stage={k} count={count} expanded={isOpen} onToggle={()=> setExpanded(e=> ({...e,[k]:!e[k]})) }/>
              {isOpen && count > 0 && santaData && (
                <div id={`panel-${k}`} role="region" aria-labelledby={`button-${k}`}>
                    <div className="divide-y divide-zinc-200/60">
                        {grouped[k].map(a=> (
                            <AccountBar key={a.id} a={a} party={partyMap[a.partyId]} santaData={santaData} onAddActivity={() => setCompletingTaskForAccount(a)} userMap={userMap} shortDate={shortDate}/>
                        ))}
                    </div>
                </div>
              )}
            </div>
          )
        })}
        {!filtered.length && (q || fltRep || fltCity || fltDist) ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">
                No hay resultados con esos filtros. <button onClick={() => { setQ(''); setFltRep(''); setFltCity(''); setFltDist(''); }} className="underline">Limpiar filtros</button>
            </div>
        ) : null}
      </div>
      {completingTaskForAccount && (
        <TaskCompletionDialog
            task={{
                id: `temp-task-${completingTaskForAccount.id}`,
                note: `Registrar actividad para ${completingTaskForAccount.name}`,
                kind: 'OTRO',
                status: 'open',
                dept: 'VENTAS',
                userId: currentUser!.id,
                accountId: completingTaskForAccount.id,
                createdAt: new Date().toISOString(),
            }}
            open={!!completingTaskForAccount}
            onClose={() => setCompletingTaskForAccount(null)}
            onSuccess={() => {
                toast.success('Actividad registrada con éxito.');
                router.refresh();
                setCompletingTaskForAccount(null);
            }}
            onError={(msg) => {
                toast.error(`Error: ${msg}`);
            }}
        />
      )}
      {isNewAccountOpen && santaData && (
        <NewAccountDialog
          open={isNewAccountOpen}
          onClose={() => setIsNewAccountOpen(false)}
          onSuccess={() => {
            toast.success('Nueva cuenta creada con éxito.');
            router.refresh();
            setIsNewAccountOpen(false);
          }}
          onError={(msg) => toast.error(`Error al crear cuenta: ${msg}`)}
          users={santaData.users}
          distributors={distOptions}
        />
      )}
    </>
  )
}
