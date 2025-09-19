
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import type { SantaData, Interaction as InteractionType, OrderSellOut, User as UserType, Distributor, InteractionKind, Account, AccountRef } from '@/domain/ssot';
import { computeAccountKPIs, accountOwnerDisplay } from '@/lib/sb-core';
import { orderTotal } from '@/domain/ssot';
import { ArrowUpRight, ArrowDownRight, Phone, Mail, MapPin, User, Factory, Boxes, Megaphone, Briefcase, Banknote, Calendar, FileText, ShoppingCart, Star, Building2, CreditCard, ChevronRight, ChevronLeft, MessageSquare, Sparkles, Tag, Clock } from "lucide-react";
import Link from 'next/link';
import { enrichAccount } from '@/ai/flows/enrich-account-flow';

import { SBFlowModal, Variant } from '@/features/quicklog/components/SBFlows';
import { SBButton, SBCard, SB_COLORS } from '@/components/ui/ui-primitives';


// ====== UI Primitives ======

function KPI({label, value, suffix, trend}:{label:string; value:string|number; suffix?:string; trend?:'up'|'down'}){
  return (
    <div className="rounded-xl border border-zinc-200 p-3 bg-white">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 flex items-center gap-1">
        <div className="text-xl font-semibold text-zinc-900">{value}{suffix? <span className="text-zinc-500 text-sm ml-1">{suffix}</span>:null}</div>
        {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-600"/>}
        {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-600"/>}
      </div>
    </div>
  );
}

function Row({label, children, icon: Icon}:{label:string; children:React.ReactNode, icon?: React.ElementType}){
  return (
    <div className="flex items-start gap-3 py-2">
       {Icon && <Icon className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />}
      <div className="w-32 text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="flex-1 text-sm text-zinc-800">{children || '—'}</div>
    </div>
  );
}

function Chip({children}:{children:React.ReactNode}){
  return <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-700">{children}</span>;
}


type UnifiedActivity = {
    id: string;
    type: 'interaction' | 'order';
    date: string;
    data: InteractionType | OrderSellOut;
}

const interactionIcons: Record<InteractionKind, React.ElementType> = {
    VISITA: User,
    LLAMADA: Phone,
    EMAIL: Mail,
    OTRO: FileText,
    WHATSAPP: MessageSquare,
};
const formatEUR = (n:number)=> new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', {day:'2-digit',month:'short', year:'numeric'});


// ====== PAGE ======
export function AccountDetailPageContent(){
  const router = useRouter();
  const params = useParams();
  
  if (!params || !params.accountId) {
    notFound();
  }
  const accountId = params.accountId as string;

  const { data: santaData, setData, currentUser } = useData();

  const [modalVariant, setModalVariant] = useState<Variant | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  const { account, unifiedActivity, kpis, owner, distributor } = useMemo(() => {
    if (!santaData || !accountId) return { account: null, unifiedActivity: [], kpis: null, owner: null, distributor: null };
    
    const acc = santaData.accounts.find(a => a.id === accountId);
    if (!acc) return { account: null, unifiedActivity: [], kpis: null, owner: null, distributor: null };
    
    const interactions = santaData.interactions.filter(i => i.accountId === accountId);
    const orders = santaData.ordersSellOut.filter(o => o.accountId === accountId);

    const unified: UnifiedActivity[] = [
        ...interactions.map(i => ({ id: `int_${i.id}`, type: 'interaction' as const, date: i.createdAt, data: i })),
        ...orders.map(o => ({ id: `ord_${o.id}`, type: 'order' as const, date: o.createdAt, data: o }))
    ];
    
    unified.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);
    const kpiData = computeAccountKPIs({
        data: santaData,
        accountId: acc.id,
        startIso: startDate.toISOString(),
        endIso: endDate.toISOString()
    });

    const own = accountOwnerDisplay(acc, santaData.users, santaData.distributors);
    
    const dist = santaData.distributors.find(d => d.id === acc.billerId);

    return { account: acc, unifiedActivity: unified, kpis: kpiData, owner: own, distributor: dist };
  }, [accountId, santaData]);

  const handleEnrich = async () => {
    if (!account || !santaData) return;
    setIsEnriching(true);
    try {
        const enrichedData = await enrichAccount({
            accountName: account.name,
            address: account.address,
            city: account.city,
        });

        const updatedAccount = { 
            ...account, 
            ...enrichedData,
            tags: Array.from(new Set([...(account.tags || []), ...enrichedData.tags])), // Merge tags
        };
        
        const updatedAccounts = santaData.accounts.map(acc => acc.id === account.id ? updatedAccount : acc);
        setData({ ...santaData, accounts: updatedAccounts });

    } catch (error) {
        console.error("Error enriching account:", error);
        alert("No se pudo enriquecer la cuenta.");
    } finally {
        setIsEnriching(false);
    }
  };


  const handleSubmit = (payload: any) => {
    if (!currentUser || !santaData) return;
    
    // Quick Interaction/Order
    if (payload.mode === 'order' || payload.mode === 'interaction') {
        const targetAccountName = payload.account || account?.name;
        const targetAccount = santaData.accounts.find(a => a.name === targetAccountName);
        if (!targetAccount) return;

        if (payload.mode === 'order') {
             const newOrder: OrderSellOut = {
                id: `ord_local_${Date.now()}`,
                accountId: targetAccount.id,
                createdAt: new Date().toISOString(),
                status: 'open',
                currency: 'EUR',
                lines: payload.items.map((item: any) => ({ ...item, priceUnit: 0, uom: 'uds' })),
                notes: payload.note,
            };
            setData({ ...santaData, ordersSellOut: [...santaData.ordersSellOut, newOrder] });
        } else {
             const newInteraction: InteractionType = {
                id: `int_local_${Date.now()}`,
                accountId: targetAccount.id,
                userId: currentUser.id,
                createdAt: new Date().toISOString(),
                kind: payload.kind,
                note: `Próxima acción: ${payload.nextAction}. Resumen: ${payload.note}`,
                dept: 'VENTAS',
                status: 'open',
            };
            setData({ ...santaData, interactions: [...santaData.interactions, newInteraction] });
        }
    }
    // Edit Account
    else if (payload.id && payload.name) {
        const updatedAccounts = santaData.accounts.map(acc => acc.id === payload.id ? { ...acc, ...payload } : acc);
        setData({ ...santaData, accounts: updatedAccounts });
    }

    setModalVariant(null);
  };
  

  if (!santaData) return <div className="p-6 text-center">Cargando datos...</div>;
  if (!account || !kpis) return <div className="p-6 text-center">Cuenta no encontrada.</div>;

  const editAccountDefaults = {
      id: account.id,
      name: account.name,
      city: account.city,
      type: account.type,
      mainContactName: account.mainContactName,
      mainContactEmail: account.mainContactEmail,
      phone: account.phone,
      address: account.address,
      billingEmail: account.billingEmail,
  };

  return (
    <div className="bg-zinc-50 flex-grow">
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Header Card */}
        <SBCard title="">
          <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl" style={{background:SB_COLORS.accent}}/>
                    <div>
                      <h1 className="text-xl font-bold text-zinc-900">{account.name}</h1>
                      <div className="text-sm text-zinc-600">{account.city} · {account.type}{account.subType && ` (${account.subType})`} · <span className="font-medium">{account.stage}</span></div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Chip>Último pedido hace {kpis.daysSinceLastOrder} días</Chip>
                      <Chip>Última visita hace {kpis.daysSinceLastVisit} días</Chip>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/accounts" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
                        <ChevronLeft size={16} /> Volver a Cuentas
                    </Link>
                    <SBButton onClick={() => setModalVariant('quick')}><ShoppingCart className="h-4 w-4"/> Nueva Actividad</SBButton>
                </div>
              </div>
          </div>
        </SBCard>

        {/* Body */}
        <main className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Col 1-2: KPIs & tablas */}
          <section className="space-y-6 xl:col-span-2">
            {/* KPIs */}
            <SBCard title="KPIs de Rendimiento (últimos 90 días)">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <KPI label="Unidades vendidas" value={kpis.unitsSold} suffix="uds."/>
                <KPI label="Nº Pedidos" value={kpis.orderCount} />
                <KPI label="Ticket medio" value={formatEUR(kpis.avgTicket)} />
                <KPI label="Días sin Pedido" value={kpis.daysSinceLastOrder || '—'} trend={kpis.daysSinceLastOrder && kpis.daysSinceLastOrder > 30 ? 'down' : undefined} />
                <KPI label="Visita→Pedido" value={kpis.visitToOrderRate || 0} suffix="%" trend={kpis.visitToOrderRate && kpis.visitToOrderRate >=50 ? 'up':'down'} />
                <KPI label="Nº Visitas" value={kpis.visitsCount} />
              </div>
            </SBCard>

            {/* Últimos pedidos */}
            <SBCard title="Actividad Reciente">
              <div className="divide-y divide-zinc-100">
                {unifiedActivity.slice(0,10).map((act)=> {
                  if (act.type === 'order') {
                    const order = act.data as OrderSellOut;
                    return (
                      <div key={act.id} className="grid grid-cols-[auto_1fr_2fr_1fr] items-center gap-3 px-4 py-3 hover:bg-zinc-50">
                          <ShoppingCart className="h-5 w-5 text-emerald-600"/>
                          <div>
                              <div className="text-sm text-zinc-800 font-semibold">{formatEUR(orderTotal(order))}</div>
                              <div className="text-xs text-zinc-500">{formatDate(order.createdAt)}</div>
                          </div>
                          <div className="text-sm text-zinc-800 col-span-2">{order.lines.map(l => `${l.qty} ${l.uom} de ${santaData.products.find(p=>p.sku === l.sku)?.name}`).join(', ')}</div>
                      </div>
                    )
                  }
                  const int = act.data as InteractionType;
                  const Icon = interactionIcons[int.kind] || FileText;
                  return (
                      <div key={act.id} className="grid grid-cols-[auto_1fr] items-start gap-3 px-4 py-3 hover:bg-zinc-50">
                        <Icon className="h-5 w-5 text-zinc-500 mt-0.5"/>
                        <div>
                            <div className="text-sm text-zinc-500">{formatDate(int.createdAt)} · <span className="font-medium capitalize text-zinc-700">{int.kind}</span></div>
                            <div className="text-sm text-zinc-800 italic col-span-2 mt-1">“{int.note}”</div>
                        </div>
                      </div>
                  )
                })}
              </div>
            </SBCard>
          </section>

          {/* Col 3: Info de cuenta */}
          <aside className="space-y-6">
            <SBCard title="Información de la Cuenta">
              <div className="p-4 space-y-2">
                <Row label="Contacto Principal" icon={User}>{account.mainContactName || '—'}<br/><span className="text-xs text-zinc-500">{account.mainContactEmail}</span></Row>
                <Row label="Teléfono" icon={Phone}>{account.phone}</Row>
                <Row label="Dirección" icon={MapPin}>{account.address}</Row>
                <Row label="Email Facturación" icon={Mail}>{account.billingEmail}</Row>
                <hr className="my-2"/>
                {owner && <Row label="Comercial" icon={Briefcase}>{owner}</Row>}
                {distributor && <Row label="Distribuidor" icon={Boxes}>{distributor.name}</Row>}
                <Row label="CIF" icon={Building2}>{account.cif}</Row>
                <hr className="my-2"/>
                 <Row label="Sub-tipo" icon={Tag}>{account.subType}</Row>
                 <Row label="Horario" icon={Clock}>{account.openingHours}</Row>
                 <Row label="Notas IA" icon={Sparkles}><span className="italic">“{account.notes}”</span></Row>
                 <Row label="Etiquetas" icon={Tag}>
                    <div className="flex flex-wrap gap-1">
                        {(account.tags || []).map(t => <Chip key={t}>{t}</Chip>)}
                    </div>
                </Row>
                <div className="mt-4 flex justify-between">
                    <SBButton variant="secondary" onClick={handleEnrich} disabled={isEnriching}>
                        <Sparkles size={14}/> {isEnriching ? 'Analizando...' : 'Enriquecer con IA'}
                    </SBButton>
                    <SBButton variant="secondary" onClick={() => setModalVariant('editAccount')}>Editar</SBButton>
                </div>
              </div>
            </SBCard>
          </aside>
        </main>
      </div>

      {modalVariant && santaData && (
         <SBFlowModal
            open={!!modalVariant}
            variant={modalVariant as Variant}
            onClose={() => setModalVariant(null)}
            accounts={santaData.accounts as AccountRef[]}
            onSearchAccounts={async(q) => santaData.accounts.filter(a => a.name.toLowerCase().includes(q.toLowerCase())) as AccountRef[]}
            onCreateAccount={async (d) => {
                 const newAccount: Account = { 
                     id: `acc_local_${Date.now()}`,
                     name: d.name, city: d.city, stage: 'POTENCIAL',
                     type: d.type || 'HORECA',
                     ownerId: currentUser!.id, 
                     billerId: 'SB',
                     createdAt: new Date().toISOString()
                 };
                 setData({...santaData, accounts: [...santaData.accounts, newAccount]});
                 return newAccount as AccountRef;
            }}
            defaults={modalVariant === 'editAccount' ? editAccountDefaults : undefined}
            onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
