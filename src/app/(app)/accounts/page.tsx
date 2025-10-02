// src/app/(app)/accounts/page.tsx

"use client"
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Search, Plus, Phone, Mail, MessageSquare, History, ShoppingCart, Info, Users, MoreVertical, Ticket, Clock } from 'lucide-react'
import type { Stage, User, Interaction, OrderSellOut, SantaData, Party, PartyRole, InteractionKind, Account, CommercialFlow } from '@/domain/ssot'
import { accountOwnerDisplay, computeAccountKPIs, getDistributorForAccount } from '@/lib/sb-core';
import Link from 'next/link'
import { useData } from '@/lib/dataprovider'
import { FilterSelect, ModuleHeader, SBButton, Badge, Input } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar';
import { NewAccountDialog } from '@/features/accounts/components/NewAccountDialog';
import { DEPT_META } from '@/domain/ssot';
import { toast } from 'sonner';
import { AccountBarDialog } from '@/features/accounts/components/AccountBarDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type StageVariant = 'info' | 'success' | 'warning' | 'destructive' | 'default';

const STAGE: Record<string, { label: string; variant: StageVariant }> = {
  ACTIVA: { label: 'Activas', variant: 'success' },
  SEGUIMIENTO: { label: 'En seguimiento', variant: 'info' },
  POTENCIAL: { label: 'Potenciales', variant: 'warning' },
  FALLIDA: { label: 'Perdidas', variant: 'destructive' },
  CERRADA: { label: 'Cerradas', variant: 'default' },
  BAJA: { label: 'Bajas', variant: 'default' },
}

const formatEUR = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function GroupBar({ stage, count, expanded, onToggle }: { stage: keyof typeof STAGE, count: number, expanded: boolean, onToggle: () => void }) {
    const s = STAGE[stage];
    if (!s) return null;
    return (
        <SBButton
            variant="ghost"
            onClick={onToggle}
            className="w-full grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 justify-between"
            aria-expanded={expanded}
            aria-controls={`panel-${stage}`}
            id={`button-${stage}`}
        >
            <div className="flex items-center gap-2 flex-grow">
                <h3 className="font-semibold text-sm">{s.label}</h3>
                <span className="text-xs font-normal text-muted-foreground">({count})</span>
            </div>
            <ChevronDown
                className="h-5 w-5 transition-transform duration-300 text-muted-foreground"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                aria-hidden="true"
            />
        </SBButton>
    );
}

function AccountBar({ a, party, santaData, onOpenDialog, userMap, shortDate }: { a: Account, party?: Party, santaData: SantaData, onOpenDialog: (accountId: string) => void, userMap: Record<string, string>, shortDate: Intl.DateTimeFormat }) {
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
      className="overflow-hidden transition-colors duration-150 hover:bg-secondary/50"
    >
        <div className="w-full grid grid-cols-[auto_1.6fr_1.2fr_1fr_1.2fr_auto] items-center gap-3 px-4 py-1.5 cursor-pointer" onClick={()=>setOpen(v=>!v)}>
            <div className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/50">
                <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{transform: open? 'rotate(180deg)':'rotate(0deg)'}} aria-hidden="true"/>
            </div>
            <div className="text-sm font-medium truncate flex items-center gap-2">
                <Link href={`/accounts/${a.id}`} className="text-foreground truncate hover:underline">{a.name}</Link>
                {orderAmount>0 && <Badge variant="success">{formatEUR(orderAmount)}</Badge>}
            </div>
            <div className="flex items-center gap-2 min-w-0"><Avatar name={owner} size="md" />
                <span className="text-sm text-foreground truncate">{owner}</span>
            </div>
            <div className="text-sm text-muted-foreground truncate">{party?.billingAddress?.city ||'—'}</div>
            <div className="text-sm text-muted-foreground truncate">{distributorName}</div>
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
            <div className="p-4 bg-background shadow-inner">
                <div className="grid grid-cols-3 gap-6">
                    <div className='col-span-2'>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Actividad Reciente</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground max-h-40 overflow-y-auto pr-2">
                            {unifiedActivity.length > 0 ? unifiedActivity.slice(0, 5).map((act, i) => {
                                if ('kind' in act) {
                                    const int = act as Interaction;
                                    const Icon = interactionIcons[int.kind] || History;
                                    return (
                                        <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                                            <Icon className="sb-icon h-4 w-4 mt-0.5" />
                                            <div>
                                                <span className="font-medium text-foreground capitalize">{int.kind}</span>
                                                <span className="text-muted-foreground"> &middot; {shortDate.format(new Date(int.createdAt))}</span>
                                                {int.note && <p className="text-foreground italic mt-0.5 line-clamp-2">“{int.note}”</p>}
                                            </div>
                                        </li>
                                    )
                                }
                                if ('lines' in act) {
                                    const order = act as OrderSellOut;
                                    return (
                                        <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                                            <ShoppingCart className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                                            <div>
                                                <span className="font-medium text-success">Pedido</span>
                                                <span className="text-muted-foreground"> &middot; {shortDate.format(new Date(order.createdAt))}</span>
                                                <p className="font-semibold text-foreground mt-0.5">{formatEUR(order.totalAmount || 0)}</p>
                                            </div>
                                        </li>
                                    )
                                }
                                return null;
                            }) : <div className="text-xs text-muted-foreground text-center py-2">No hay actividad registrada.</div>}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">KPIs (90d)</h4>
                        {kpis && <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-center p-2 bg-secondary/50 rounded flex flex-col items-center gap-1">
                                <Ticket size={16} className="text-muted-foreground"/>
                                <div className="font-bold text-base">{formatEUR(kpis.avgTicket)}</div>
                                <div className="text-muted-foreground">Ticket Medio</div>
                            </div>
                            <div className="text-center p-2 bg-secondary/50 rounded flex flex-col items-center gap-1">
                                <ShoppingCart size={16} className="text-muted-foreground"/>
                                <div className="font-bold text-base">{kpis.orderCount}</div>
                                <div className="text-muted-foreground">Nº Pedidos</div>
                            </div>
                            <div className="text-center p-2 bg-secondary/50 rounded flex flex-col items-center gap-1">
                                <MessageSquare size={16} className="text-muted-foreground"/>
                                <div className="font-bold text-base">{kpis.visitsCount}</div>
                                <div className="text-muted-foreground">Nº Visitas</div>
                            </div>
                            <div className="text-center p-2 bg-secondary/50 rounded flex flex-col items-center gap-1">
                                <Clock size={16} className="text-muted-foreground"/>
                                <div className="font-bold text-base">{kpis.daysSinceLastOrder ?? '—'}</div>
                                <div className="text-muted-foreground">Días s/ Pedido</div>
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
  const { data: santaData, currentUser } = useData();
  const searchParams = useSearchParams();
  const flowParam = searchParams.get('flow')?.toUpperCase();
  const flow: CommercialFlow = flowParam === 'DIRECT' ? 'DIRECT' : 'PLACEMENT';
  
  const [q,setQ]=useState('');
  const [expanded,setExpanded] = useState<Record<string,boolean>>({ ACTIVA:true });
  const [fltRep, setFltRep] = useState("");
  const [fltCity, setFltCity] = useState("");
  const [fltDist, setFltDist] = useState("");
  
  const [dialogState, setDialogState] = useState<{ open: boolean; accountId: string | null }>({ open: false, accountId: null });
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
    const g: Record<string,Account[]> = { ACTIVA:[], SEGUIMIENTO:[], POTENCIAL:[], FALLIDA:[], CERRADA: [], BAJA: [] };
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

  const stageColorVar = (variant: StageVariant) => {
    if (variant === 'success') return 'hsl(var(--success))';
    if (variant === 'info') return 'hsl(var(--info-foreground))';
    if (variant === 'warning') return 'hsl(var(--destructive))'; // Assuming destructive is amber/orange like in some setups
    if (variant === 'destructive') return 'hsl(var(--destructive))';
    return 'hsl(var(--muted-foreground))';
  }

  return (
    <>
      <ModuleHeader title={`Cuentas de ${flow === 'PLACEMENT' ? 'Colocación' : 'Venta Directa'}`} icon={Users}>
        <SBButton onClick={() => setIsNewAccountOpen(true)} className="bg-[hsl(var(--sb-accent-ventas))] text-white">
            <Plus size={16} /> Nueva Cuenta
        </SBButton>
      </ModuleHeader>
      <div className="w-full px-4 lg:px-8 pt-3 pb-1 sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="accounts-search"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cuenta, comercial, ciudad... (F)"
              className="pl-9"
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
          if (count === 0) return null;
          const isOpen = !!expanded[k];
          const s = STAGE[k];
          const color = stageColorVar(s.variant);
          return (
            <div key={k} id={`group-${k}`} className="w-full rounded-lg overflow-hidden bg-secondary/30"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <GroupBar stage={k} count={count} expanded={isOpen} onToggle={()=> setExpanded(e=> ({...e,[k]:!e[k]})) }/>
              {isOpen && santaData && (
                <div id={`panel-${k}`} role="region" aria-labelledby={`button-${k}`}>
                    <div className="divide-y divide-border">
                        {grouped[k].map(a=> (
                            <AccountBar key={a.id} a={a} party={partyMap[a.partyId]} santaData={santaData} onOpenDialog={(id) => setDialogState({ open: true, accountId: id })} userMap={userMap} shortDate={shortDate}/>
                        ))}
                    </div>
                </div>
              )}
            </div>
          )
        })}
        {!filtered.length && (q || fltRep || fltCity || fltDist) ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
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
