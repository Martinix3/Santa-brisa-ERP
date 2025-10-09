// src/app/(app)/accounts/page.tsx
"use client"
import React, { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Search, Plus, Phone, Mail, MessageSquare, ShoppingCart, Users, MoreVertical, List, LayoutGrid } from 'lucide-react'
import type { Stage, Team, Interaction, Order, InteractionKind, Account, CommercialFlow } from '@/domain/ssot.v7'
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { useData } from '@/lib/dataprovider'
import { FilterSelect, ModuleHeader, SBButton, Badge, Input } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar';
import { NewAccountDialog } from '@/features/accounts/components/NewAccountDialog';
import { AccountsPipelineView } from '@/features/accounts/components/AccountsPipelineView';
import { toast } from 'sonner';
import { AccountBarDialog } from '@/features/accounts/components/AccountBarDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import Link from 'next/link'

type ViewType = 'list' | 'pipeline';

const STAGE_META: Record<Stage, { label: string; variant: 'default' | 'primary' | 'info' | 'destructive' }> = {
  POTENCIAL: { label: 'Potencial', variant: 'info' },
  ACTIVA: { label: 'Activa', variant: 'primary' },
  SEGUIMIENTO: { label: 'Seguimiento', variant: 'default' },
  FALLIDA: { label: 'Fallida', variant: 'destructive' },
  CERRADA: { label: 'Cerrada', variant: 'default' },
  BAJA: { label: 'Baja', variant: 'default' },
};

const formatEUR = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function GroupBar({ stage, count, expanded, onToggle }: { stage: Stage, count: number, expanded: boolean, onToggle: () => void }) {
    const s = STAGE_META[stage];
    if (!s) return null;
    return (
        <SBButton
            variant="ghost"
            onClick={onToggle}
            className="w-full grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 justify-between"
        >
            <div className="flex items-center gap-2 flex-grow">
                <h3 className="font-semibold text-sm">{s.label}</h3>
                <span className="text-xs font-normal text-muted-foreground">({count})</span>
            </div>
            <ChevronDown
                className="h-5 w-5 transition-transform duration-300 text-muted-foreground"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
        </SBButton>
    );
}

function AccountBar({ 
  account, 
  interactions, 
  orders, 
  teams,
  onOpenDialog, 
  shortDate 
}: { 
  account: Account; 
  interactions: Interaction[]; 
  orders: Order[]; 
  teams: Team[];
  onOpenDialog: (accountId: string) => void; 
  shortDate: Intl.DateTimeFormat;
}) {
  const [open, setOpen] = useState(false);
  
  const salesRepName = useMemo(() => {
    const team = teams.find(t => t.id === account.salesRepId);
    return team?.name || '—';
  }, [account.salesRepId, teams]);
  
  const orderAmount = useMemo(() => 
    orders.reduce((sum, o) => sum + (o.totalEUR || 0), 0),
    [orders]
  );
  
  const unifiedActivity = useMemo(() => {
    const unified: (Interaction | Order)[] = [...interactions, ...orders];
    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return unified.slice(0, 5);
  }, [interactions, orders]);
  
  const interactionIcons: Record<InteractionKind, React.ElementType> = {
    VISITA: MessageSquare,
    LLAMADA: Phone,
    EMAIL: Mail,
    WHATSAPP: MessageSquare,
    OTRO: MessageSquare,
  };

  return (
    <div className="overflow-hidden">
      <div 
        className="w-full grid grid-cols-[auto_1.6fr_1.2fr_1fr_1.2fr_auto] items-center gap-3 px-4 py-1.5 cursor-pointer transition-colors duration-150 hover:bg-muted/30" 
        onClick={() => setOpen(v => !v)}
      >
        <div className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/50">
          <ChevronDown 
            className="h-4 w-4 transition-transform duration-300" 
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} 
          />
        </div>
        <div className="text-sm font-medium truncate flex items-center gap-2">
          <Link href={`/accounts/${account.id}`} className="text-foreground truncate hover:underline">
            {account.name}
          </Link>
          {orderAmount > 0 && <Badge variant="success">{formatEUR(orderAmount)}</Badge>}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={salesRepName} size="md" />
          <span className="text-sm text-foreground truncate">{salesRepName}</span>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {account.billingAddress?.city || '—'}
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {account.commercialFlow === 'DIRECTA' ? 'Directa' : 'Colocación'}
        </div>
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SBButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </SBButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onOpenDialog(account.id)}>
                Acciones Rápidas
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/accounts/${account.id}`}>Ver Ficha</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {open && (
        <div className="p-4 bg-background shadow-inner">
          <div className="grid grid-cols-3 gap-6">
            <div className='col-span-2'>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Actividad Reciente
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground max-h-40 overflow-y-auto pr-2">
                {unifiedActivity.length > 0 ? unifiedActivity.map((act, i) => {
                  if ('kind' in act) {
                    const int = act as Interaction;
                    const Icon = interactionIcons[int.kind] || MessageSquare;
                    return (
                      <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                        <Icon className="h-4 w-4 mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground capitalize">{int.kind}</span>
                          <span className="text-muted-foreground"> · {shortDate.format(new Date(int.createdAt))}</span>
                          {int.summary && <p className="text-foreground italic mt-0.5 line-clamp-2">"{int.summary}"</p>}
                        </div>
                      </li>
                    )
                  }
                  if ('lines' in act) {
                    const order = act as Order;
                    return (
                      <li key={`act_${i}`} className="flex items-start gap-3 text-xs">
                        <ShoppingCart className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <div>
                          <span className="font-medium text-success">Pedido</span>
                          <span className="text-muted-foreground"> · {shortDate.format(new Date(order.createdAt))}</span>
                          <p className="font-semibold text-foreground mt-0.5">
                            {formatEUR(order.totalEUR || 0)}
                          </p>
                        </div>
                      </li>
                    )
                  }
                  return null;
                }) : (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No hay actividad registrada.
                  </div>
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                KPIs (90d)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-secondary/50 rounded flex flex-col items-center gap-1">
                  <ShoppingCart size={16} className="text-muted-foreground" />
                  <div className="font-bold text-base">{orders.length}</div>
                  <div className="text-muted-foreground">Pedidos</div>
                </div>
                <div className="text-center p-2 bg-secondary/50 rounded flex flex-col items-center gap-1">
                  <MessageSquare size={16} className="text-muted-foreground" />
                  <div className="font-bold text-base">{interactions.length}</div>
                  <div className="text-muted-foreground">Visitas</div>
                </div>
              </div>
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
  const { config } = useSystemConfig();
  const searchParams = useSearchParams();
  const flowParam = searchParams.get('flow')?.toUpperCase();
  const flow: CommercialFlow = flowParam === 'COLOCACION' ? 'COLOCACION' : 'DIRECTA';
  
  const ventasColor = config?.theme?.departments?.VENTAS?.color || '#10b981';
  
  const [q, setQ] = useState('');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ ACTIVA: true });
  const [fltRep, setFltRep] = useState("");
  const [fltCity, setFltCity] = useState("");
  
  const [dialogState, setDialogState] = useState<{ open: boolean; accountId: string | null }>({ 
    open: false, 
    accountId: null 
  });
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key && e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = document.getElementById('accounts-search') as HTMLInputElement | null;
        el?.focus();
        e.preventDefault();
      }
      if (e.key === 'Escape') setQ('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const accounts = useMemo(() => santaData?.accounts || [], [santaData]);
  const teams = useMemo(() => santaData?.teams || [], [santaData]);
  const interactions = useMemo(() => santaData?.interactions || [], [santaData]);
  const orders = useMemo(() => santaData?.orders || [], [santaData]);

  const { repOptions, cityOptions } = useMemo(() => {
    const reps = new Set<string>();
    const cities = new Set<string>();
    
    accounts.forEach(a => {
      if (a.salesRepId) reps.add(a.salesRepId);
      if (a.billingAddress?.city) cities.add(a.billingAddress.city);
    });

    return {
      repOptions: Array.from(reps)
        .map(id => {
          const team = teams.find(t => t.id === id);
          return { value: id, label: team?.name || id };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
      cityOptions: Array.from(cities)
        .map(c => ({ value: c, label: c }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [accounts, teams]);

  const shortDate = useMemo(() => new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }), []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    
    return accounts.filter(a => {
      if (a.commercialFlow !== flow) return false;

      const teamName = teams.find(t => t.id === a.salesRepId)?.name || '';
      const city = a.billingAddress?.city || '';

      const matchesQuery = !s || [a.name, city, a.stage, teamName]
        .some(v => (v || '').toString().toLowerCase().includes(s));
      const matchesRep = !fltRep || a.salesRepId === fltRep;
      const matchesCity = !fltCity || city === fltCity;

      return matchesQuery && matchesRep && matchesCity;
    });
  }, [q, accounts, flow, fltRep, fltCity, teams]);

  const grouped = useMemo(() => {
    const g: Record<Stage, Account[]> = {
      ACTIVA: [],
      SEGUIMIENTO: [],
      POTENCIAL: [],
      FALLIDA: [],
      CERRADA: [],
      BAJA: [],
    };
    filtered.forEach(a => {
      if (a.stage && g[a.stage]) {
        g[a.stage].push(a);
      }
    });
    return g;
  }, [filtered]);

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
      <ModuleHeader title="Cuentas" icon={Users}>
        <SBButton 
          onClick={() => setIsNewAccountOpen(true)} 
          style={{ backgroundColor: ventasColor, color: '#ffffff' }}
        >
          <Plus size={16} /> Nueva Cuenta
        </SBButton>
      </ModuleHeader>
      
      {/* Tabs para Venta Directa / Colocación */}
      <div className="w-full px-4 lg:px-8 pt-4 pb-2 bg-background border-b">
        <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg w-fit">
          <button
            onClick={() => router.push('/accounts?flow=DIRECTA')}
            className={`h-8 px-4 rounded-md text-sm font-medium transition-colors ${
              flow === 'DIRECTA'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Directas
          </button>
          <button
            onClick={() => router.push('/accounts?flow=COLOCACION')}
            className={`h-8 px-4 rounded-md text-sm font-medium transition-colors ${
              flow === 'COLOCACION'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Colocación
          </button>
        </div>
      </div>
      
      <div className="w-full px-4 lg:px-8 pt-3 pb-1 sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-2 mb-3">
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
          
          {/* Toggle Vista */}
          <button
            onClick={() => setViewType(viewType === 'list' ? 'pipeline' : 'list')}
            className="px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-zinc-50"
            style={{
              borderColor: ventasColor,
              color: ventasColor
            }}
          >
            {viewType === 'list' ? (
              <><LayoutGrid size={16} className="inline mr-1" /> Ver Pipeline</>
            ) : (
              <><List size={16} className="inline mr-1" /> Ver Lista</>
            )}
          </button>
        </div>
      </div>
      
      <div className="w-full px-4 md:px-6 pb-6 space-y-3">
        {/* Vista Pipeline */}
        {viewType === 'pipeline' && santaData && (
          <AccountsPipelineView accounts={filtered} data={santaData} />
        )}

        {/* Vista Lista */}
        {viewType === 'list' && (
          <>
            {(Object.keys(STAGE_META) as Stage[]).map(stage => {
              const accountsInStage = grouped[stage] || [];
              const count = accountsInStage.length;
              if (count === 0) return null;
              const isOpen = !!expanded[stage];
              const s = STAGE_META[stage];
              
              return (
                <div 
                  key={stage} 
                  className={cn(
                    'w-full rounded-lg overflow-hidden border-l-4',
                    s.variant === 'info' && 'border-info bg-info/10',
                    s.variant === 'primary' && 'border-primary bg-primary/10',
                    s.variant === 'destructive' && 'border-destructive bg-destructive/10',
                    s.variant === 'default' && 'border-muted bg-secondary/80',
                  )}
                >
                  <GroupBar 
                    stage={stage} 
                    count={count} 
                    expanded={isOpen} 
                    onToggle={() => setExpanded(e => ({ ...e, [stage]: !e[stage] }))} 
                  />
                  {isOpen && (
                    <div className="divide-y divide-border">
                      {accountsInStage.map(account => (
                        <AccountBar 
                          key={account.id} 
                          account={account}
                          interactions={interactions.filter((i: Interaction) => i.accountId === account.id)}
                          orders={orders.filter((o: Order) => o.accountId === account.id)}
                          teams={teams}
                          onOpenDialog={(id) => setDialogState({ open: true, accountId: id })} 
                          shortDate={shortDate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {!filtered.length && (q || fltRep || fltCity) ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No hay resultados con esos filtros.{' '}
                <SBButton 
                  variant="ghost" 
                  onClick={() => { setQ(''); setFltRep(''); setFltCity(''); }} 
                  className="underline"
                >
                  Limpiar filtros
                </SBButton>
              </div>
            ) : null}
          </>
        )}
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
          teams={teams}
        />
      )}
    </>
  )
}
