// src/features/accounts/components/AccountsPage.tsx

"use client"
import React, { useMemo, useState, useEffect } from 'react'
import { ChevronDown, Search, Plus, Phone, Mail, MessageSquare, Calendar, History, ShoppingCart, Info, BarChart3, UserPlus, Users, MoreVertical } from 'lucide-react'
import type { Account as AccountType, Stage, User, Interaction, OrderSellOut, SantaData, CustomerData, Party, PartyRole, InteractionKind, Payload } from '@/domain'
import { accountOwnerDisplay, computeAccountKPIs, getDistributorForAccount, orderTotal } from '@/lib/sb-core';
import Link from 'next/link'
import { useData } from '@/lib/dataprovider'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog'
import { Avatar } from '@/components/ui/Avatar';

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
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-3 py-2 rounded-t-lg transition-colors cursor-pointer"
            style={{ backgroundColor: s.tint, color: s.text }}
            aria-expanded={expanded}
        >
            <div className="flex items-center gap-2 flex-grow">
                <h3 className="font-semibold text-sm">{s.label}</h3>
                <span className="text-xs font-normal opacity-80">({count})</span>
            </div>
            <ChevronDown
                className="h-5 w-5 transition-transform duration-300"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
        </button>
    );
}

function AccountBar({ a, party, santaData, onAddActivity }: { a: AccountType, party?: Party, santaData: SantaData, onAddActivity: (acc: AccountType) => void }) {
  const [open, setOpen] = useState(false);
  const s = STAGE[a.stage as keyof typeof STAGE] ?? STAGE.ACTIVA;
  
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
    <div className="overflow-hidden transition-all duration-200 hover:bg-black/5 rounded-lg border border-zinc-200/50">
      <div className="w-full flex items-center cursor-pointer" onClick={()=>setOpen(v=>!v)}>
          <button onClick={(e)=>{ e.stopPropagation(); setOpen(v=>!v); }} className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100/20 ml-4" title={open ? 'Cerrar detalle' : 'Ver detalle'}>
            <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{transform: open? 'rotate(180deg)':'rotate(0deg)'}}/>
          </button>
          <div className="w-full grid grid-cols-[1.6fr_1.2fr_1fr_1.2fr_auto] items-center gap-3 px-4 py-1.5">
            <div className="text-sm font-medium truncate flex items-center gap-2">
            <Link href={`/accounts/${a.id}`} className="text-zinc-900 truncate hover:underline">{a.name}</Link>
            {orderAmount>0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 whitespace-nowrap">{formatEUR(orderAmount)}</span>}
            </div>
            <div className="flex items-center gap-2 min-w-0"><Avatar name={owner} size="md" /><span className="text-sm text-zinc-700 truncate">{owner}</span></div>
            <div className="text-sm text-zinc-700 truncate">{party?.addresses[0]?.city ||'—'}</div>
            <div className="text-sm text-zinc-700 truncate">{distributorName}</div>
            <div className="text-right relative group">
            <button className="p-1.5 rounded-md border border-zinc-200 bg-white/50 text-zinc-700 inline-flex items-center transition-all hover:bg-white/90 hover:border-zinc-300 hover:scale-105" title="Acciones">
                <MoreVertical className="h-3.5 w-3.5"/>
            </button>
            <div className="absolute right-0 top-full mt-1 z-10 w-48 bg-white border rounded-md shadow-lg hidden group-hover:block">
                <Link href={`/accounts/${a.id}`} className="block w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Ver Ficha de Cliente</Link>
                <button onClick={(e) => { e.stopPropagation(); onAddActivity(a); }} className="block w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Añadir Interacción/Venta</button>
            </div>
            </div>
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
  const { data: santaData, setData, currentUser, saveCollection, saveAllCollections } = useData();
  
  const [q,setQ]=useState('');
  const [expanded,setExpanded] = useState<Record<string,boolean>>({ ACTIVA:true });
  const [fltRep, setFltRep] = useState("");
  const [fltCity, setFltCity] = useState("");
  const [fltDist, setFltDist] = useState("");
  
  const [completingTaskForAccount, setCompletingTaskForAccount] = useState<AccountType | null>(null);

  const data = useMemo(() => santaData?.accounts || [], [santaData]);

  const { repOptions, cityOptions, distOptions } = useMemo(() => {
    if (!santaData || !santaData.users || !santaData.partyRoles || !santaData.parties) {
      return { repOptions: [], cityOptions: [], distOptions: [] };
    }
    const reps = new Set<string>();
    const cities = new Set<string>();
    
    data.forEach(a => {
      reps.add(a.ownerId);
      const party = santaData.parties.find(p => p.id === a.partyId);
      if (party?.addresses[0]?.city) cities.add(party.addresses[0].city);
    });

    const distributorRoles = santaData.partyRoles.filter(r => r.role === 'DISTRIBUTOR');
    
    const userMap = santaData.users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>);
    
    const partyMap = santaData.parties.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);

    return {
      repOptions: Array.from(reps).map(id => ({ value: id, label: userMap[id] || partyMap[id] || id })).sort((a,b) => a.label.localeCompare(b.label)),
      cityOptions: Array.from(cities).map(c => ({ value: c, label: c })).sort((a,b) => a.label.localeCompare(b.label)),
      distOptions: distributorRoles.map(role => ({ value: role.partyId, label: partyMap[role.partyId] || role.partyId })).sort((a,b) => a.label.localeCompare(b.label)),
    };
  }, [data, santaData]);

  const filtered = useMemo(() => {
    if (!santaData) return [];
    const s = q.trim().toLowerCase();
    
    return data.filter(a => {
      const ownerName = accountOwnerDisplay(a, santaData.users, santaData.partyRoles);
      const party = santaData.parties.find(p => p.id === a.partyId);
      const city = party?.addresses[0]?.city || '';

      const customerRole = (santaData.partyRoles || []).find(pr => pr.partyId === a.partyId && pr.role === 'CUSTOMER');
      const billerId = (customerRole?.data as CustomerData)?.billerId;

      const matchesQuery = !s || [a.name, city, a.type, a.stage, ownerName].some(v=> (v||'').toString().toLowerCase().includes(s));
      const matchesRep = !fltRep || a.ownerId === fltRep;
      const matchesCity = !fltCity || city === fltCity;
      const matchesDist = !fltDist || billerId === fltDist;

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

    const handleSaveCompletedTask = async (
        accountId: string,
        payload: Payload
    ) => {
        if (!santaData || !currentUser) return;
    
        const collectionsToSave: Partial<SantaData> = {};

        if (payload.type === 'venta') {
            const newOrder: OrderSellOut = {
                id: `ord_${Date.now()}`,
                accountId: accountId,
                status: 'open',
                currency: 'EUR',
                createdAt: new Date().toISOString(),
                lines: payload.items.map(item => ({ sku: item.sku, qty: item.qty, uom: 'uds', priceUnit: 0 })),
                notes: `Pedido rápido creado desde lista de cuentas`,
            };
            collectionsToSave.ordersSellOut = [...(santaData.ordersSellOut || []), newOrder];
        } else { 
            const newInteraction: Partial<Interaction> = {
                id: `int_${Date.now()}`,
                userId: currentUser.id,
                accountId: accountId,
                kind: 'OTRO',
                note: (payload as any).note,
                createdAt: new Date().toISOString(),
                dept: 'VENTAS',
                status: 'done',
            };
            
            if (payload.type === 'interaccion' && payload.nextActionDate) {
                 const newFollowUp: Interaction = {
                    id: `int_${Date.now() + 1}`,
                    userId: currentUser.id,
                    accountId: accountId,
                    kind: 'OTRO', 
                    note: `Seguimiento de: ${(payload as any).note}`,
                    plannedFor: payload.nextActionDate,
                    createdAt: new Date().toISOString(),
                    dept: 'VENTAS',
                    status: 'open',
                };
                collectionsToSave.interactions = [...(santaData.interactions || []), newInteraction as Interaction, newFollowUp];
            } else {
                collectionsToSave.interactions = [...(santaData.interactions || []), newInteraction as Interaction];
            }
        }
    
        setData(prevData => prevData ? { ...prevData, ...collectionsToSave } : null);
        await saveAllCollections(collectionsToSave);
    
        setCompletingTaskForAccount(null);
    };
  
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
                  {grouped[k].map(a=> {
                      const party = santaData.parties.find(p => p.id === a.partyId);
                      return <AccountBar key={a.id} a={a} party={party} santaData={santaData} onAddActivity={() => setCompletingTaskForAccount(a)}/>
                  }) }
                </div>
              )}
            </div>
          )
        })}
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
            onComplete={(taskId, payload) => handleSaveCompletedTask(completingTaskForAccount.id, payload as Payload)}
        />
      )}
    </>
  )
}
