// src/app/(app)/accounts/page.tsx

"use client"
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, Plus, Phone, Mail, MessageSquare, Calendar, History, ShoppingCart, Info, BarChart3, UserPlus, Users, MoreVertical, Ticket, Clock, Edit, FileText } from 'lucide-react'
import type { Stage, User, Interaction, OrderSellOut, SantaData, CustomerData, Party, PartyRole, InteractionKind, Payload, Account, AccountType, Uom, CommercialFlow } from '@/domain/ssot'
import { accountOwnerDisplay, computeAccountKPIs, getDistributorForAccount, orderTotal } from '@/lib/sb-core';
import Link from 'next/link'
import { useData } from '@/lib/dataprovider'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog'
import { Avatar } from '@/components/ui/Avatar';
import { NewAccountDialog } from '@/features/accounts/components/NewAccountDialog';
import { DEPT_META } from '@/domain/ssot';
import { toast } from 'sonner';
import { AccountBarDialog } from '@/features/accounts/components/AccountBarDialog';
import { SBButton, Badge } from '@/components/ui/ui-primitives';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const STAGE: Record<string, { label:string; tint:string; text:string }> = {
  ACTIVA: { label:'Activas', tint:'#A7D8D9', text:'#17383a' },
  SEGUIMIENTO: { label:'En seguimiento', tint:'#F7D15F', text:'#3f3414' },
  POTENCIAL: { label:'Potenciales', tint:'#D7713E', text:'#40210f' },
  FALLIDA: { label:'Perdidas', tint:'#618E8F', text:'#153235' },
}
const formatEUR = (n:number)=> new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)

function GroupBar({ stage, count, expanded, onToggle }: { stage: keyof typeof STAGE, count: number, expanded: boolean, onToggle: () => void }) {
    const s = STAGE[stage];
    if (!s) return null;
    return (
        <SBButton
            variant="ghost"
            onClick={onToggle}
            className="w-full grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 transition-colors cursor-pointer bg-zinc-50/50 justify-between"
            aria-expanded={expanded}
            aria-controls={`panel-${stage}`}
            id={`button-${stage}`}
        >
            <div className="flex items-center gap-2 flex-grow">
                <h3 className="font-semibold text-sm" style={{color: s.text}}>{s.label}</h3>
                <span className="text-xs font-normal opacity-80" style={{color: s.text}}>({count})</span>
            </div>
            <ChevronDown
                className="h-5 w-5 transition-transform duration-300"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', color: s.text }}
                aria-hidden="true"
            />
        </SBButton>
    );
}

function AccountBar({ a, party, santaData, onAddActivity, onOpenDialog, userMap, shortDate }: { a: Account, party?: Party, santaData: SantaData, onAddActivity: (acc: Account) => void, onOpenDialog: (accountId: string) => void, userMap: Record<string, string>, shortDate: Intl.DateTimeFormat }) {
  const [open, setOpen] = useState(false);
  
  const owner = useMemo(() => accountOwnerDisplay(a, santaData.users, santaData.partyRoles), [a, santaData.users, santaData.partyRoles]);
  const orderAmount = useMemo(()=> (santaData.ordersSellOut || []).filter((o: OrderSellOut)=>o.accountId===a.id).reduce((n: number,o: OrderSellOut)=> n + (o.totalAmount || 0), 0), [a.id, santaData.ordersSellOut]);
  
  const { unifiedActivity, kpis } = useMemo(() => {
    if (!santaData) return { unifiedActivity: [], kpis: null };
    const interactions = santaData.interactions.filter((i: Interaction) => i.accountId === a.id);
    const orders = santaData.ordersSellOut.filter((o: OrderSellOut) => o.accountId === a.id);

    const unified: (Interaction | OrderSellOut)[] = [...interactions, ...orders];
    unified.sort((a,b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
      
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
      return getDistributorForAccount(a, santaData.partyRoles, santaData.parties)?.name || '—';
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
                {orderAmount>0 && <Badge variant="success">{formatEUR(orderAmount)}</Badge>}
            </div>
            <div className="flex items-center gap-2 min-w-0"><Avatar name={owner} size="md" />
                <span className="text-sm text-zinc-700 truncate">{owner}</span>
            </div>
            <div className="text-sm text-zinc-700 truncate">{party?.billingAddress?.city ||'—'}</div>
            <div className="text-sm text-zinc-700 truncate">{distributorName}</div>
            <div className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SBButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4"/>
                        </SBButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => onOpenDialog(a.id)}>
                            Acciones Rápidas
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                           <Link href={`/accounts/${a.id}`}>Ver Ficha</Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        {open && kpis && (
            <div className="p-4 bg-white shadow-inner">
                <div className="grid grid-cols-3 gap-6">
                    <div className='col-span-2'>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Actividad Reciente</h4>
                        <ul className="space-y-1 text-sm text-zinc-700 max-h-40 overflow-y-auto pr-2">
                            {unifiedActivity.length > 0 ? unifiedActivity.slice(0, 5).map((act, i) => {
                                if ('kind' in act) {
                                    const int = act as Interaction;
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
                                if ('lines' in act) {
                                    const order = act as OrderSellOut;
                                    return (
                                        <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                                            <ShoppingCart className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                                            <div>
                                                <span className="font-medium text-emerald-800">Pedido</span>
                                                <span className="text-zinc-500"> &middot; {shortDate.format(new Date(order.createdAt))}</span>
                                                <p className="font-semibold text-zinc-800 mt-0.5">{formatEUR(order.totalAmount || 0)}</p>
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

export default function AccountsPage() {
  const router = useRouter();
  const { data: santaData, setData, currentUser, saveAllCollections } = useData();
  const searchParams = useSearchParams();
  const flowParam = searchParams.get('flow')?.toUpperCase();
  const flow: CommercialFlow = flowParam === 'DIRECT' ? 'DIRECT' : 'PLACEMENT';
  
  const [q,setQ]=useState('');
  const [expanded,setExpanded] = useState<Record<string,boolean>>({ ACTIVA:true });
  const [fltRep, setFltRep] = useState("");
  const [fltCity, setFltCity] = useState("");
  const [fltDist, setFltDist] = useState("");
  
  const [dialogState, setDialogState] = useState<{ open: boolean; accountId: string | null }>({ open: false, accountId: null });
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
      if(a.ownerId) reps.add(a.ownerId);
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
      // Show PLACEMENT accounts by default, not DIRECT
      if (a.flow !== flow) return false;

      const ownerName = a.ownerId ? userMap[a.ownerId] : '';
      const party = partyMap[a.partyId];
      const city = party?.billingAddress?.city || '';

      const matchesQuery = !s || [a.name, city, a.stage, ownerName].some(v=> (v||'').toString().toLowerCase().includes(s));
      const matchesRep = !fltRep || a.ownerId === fltRep;
      const matchesCity = !fltCity || city === fltCity;
      const matchesDist = !fltDist || a.distributorPartyId === fltDist;

      return matchesQuery && matchesRep && matchesCity && matchesDist;
    });
  }, [q, data, flow, fltRep, fltCity, fltDist, santaData, userMap, partyMap]);

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
      <ModuleHeader title={`Cuentas de ${flow === 'PLACEMENT' ? 'Colocación' : 'Venta Directa'}`} icon={Users}>
        <SBButton onClick={() => setIsNewAccountOpen(true)} style={{ backgroundColor: DEPT_META.VENTAS.color, color: DEPT_META.VENTAS.textColor }}>
            <Plus size={16} /> Nueva Cuenta
        </SBButton>
      </ModuleHeader>
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
        {(Object.keys(STAGE) as Array<keyof typeof STAGE>).map(k=>{
          const count = grouped[k]?.length || 0;
          const isOpen = !!expanded[k];
          const s = STAGE[k];
          return (
            <div key={k} id={`group-${k}`} className="w-full rounded-lg overflow-hidden"
              style={{
                borderLeft: `4px solid ${s.tint}`,
                backgroundColor: `${s.tint}1A`,
              }}
            >
              <GroupBar stage={k} count={count} expanded={isOpen} onToggle={()=> setExpanded(e=> ({...e,[k]:!e[k]})) }/>
              {isOpen && count > 0 && santaData && (
                <div id={`panel-${k}`} role="region" aria-labelledby={`button-${k}`}>
                    <div className="divide-y divide-zinc-200/60">
                        {grouped[k].map(a=> (
                            <AccountBar key={a.id} a={a} party={partyMap[a.partyId]} santaData={santaData} onAddActivity={() => setCompletingTaskForAccount(a)} onOpenDialog={(id) => setDialogState({ open: true, accountId: id })} userMap={userMap} shortDate={shortDate}/>
                        ))}
                    </div>
                </div>
              )}
            </div>
          )
        })}
        {!filtered.length && (q || fltRep || fltCity || fltDist) ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">
                No hay resultados con esos filtros. <SBButton variant="ghost" onClick={() => { setQ(''); setFltRep(''); setFltCity(''); setFltDist(''); }} className="underline">Limpiar filtros</SBButton>
            </div>
        ) : null}
      </div>

      {dialogState.open && dialogState.accountId && (
        <AccountBarDialog
          open={dialogState.open}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDialogState({ open: false, accountId: null });
          }}
          accountId={dialogState.accountId}
        />
      )}

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
