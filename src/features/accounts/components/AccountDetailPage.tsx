
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import type { SantaData, Interaction as InteractionType, OrderSellOut, User as UserType, Party, InteractionKind, Account, CustomerData, PartyRole, Activation, Promotion, AccountRollup, AccountType, PosTactic, PosCostCatalogEntry, PlvMaterial, SB_THEME } from '@/domain/ssot';
import { computeAccountKPIs, accountOwnerDisplay, orderTotal, getDistributorForAccount, computeAccountRollup } from '@/lib/sb-core';
import { ArrowUpRight, ArrowDownRight, Phone, Mail, MapPin, User, Factory, Boxes, Megaphone, Briefcase, Banknote, Calendar, FileText, ShoppingCart, Star, Building2, CreditCard, ChevronRight, ChevronLeft, MessageSquare, Sparkles, Tag, Clock, Edit, Plus } from "lucide-react";
import Link from 'next/link';
import { enrichAccount } from '@/ai/flows/enrich-account-flow';
import { NewPosTacticDialog } from '@/features/marketing/components/NewPosTacticDialog';
import { usePosTacticsService } from '@/features/marketing/services/posTactics.service';

import { SBFlowModal } from '@/features/quicklog/components/SBFlows';
import { SBButton, SBCard } from '@/components/ui/ui-primitives';
import { SB_COLORS } from '@/domain/ssot';

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
            {Icon && <Icon className="sb-icon h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />}
            <div className="w-32 text-xs uppercase tracking-wide text-zinc-500">{label}</div>
            <div className="flex-1 text-sm text-zinc-800">{children || '—'}</div>
        </div>
    );
}

function Chip({children, color = 'zinc'}: {children: React.ReactNode, color?: 'zinc' | 'green' | 'amber' | 'red' | 'blue' }){
  const colorClasses: Record<string, string> = {
      zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${colorClasses[color]}`}>{children}</span>;
}

const interactionIcons: Record<InteractionKind, React.ElementType> = {
    VISITA: User,
    LLAMADA: Phone,
    EMAIL: Mail,
    OTRO: FileText,
    WHATSAPP: MessageSquare,
    COBRO: Banknote,
    EVENTO_MKT: Megaphone,
};

const formatEUR = (n:number)=> new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', {day:'2-digit',month:'short', year:'numeric'});

function RollupBadge({ label, value, date, color = 'zinc' }: { label: string; value: string | number; date?: string; color?: 'zinc' | 'green' | 'amber' | 'red' | 'blue' }) {
    const colorClasses: Record<string, string> = {
        zinc: 'bg-zinc-50 border-zinc-200 text-zinc-800',
        green: 'bg-green-50 border-green-200 text-green-800',
        amber: 'bg-amber-50 border-amber-200 text-amber-800',
        red: 'bg-red-50 border-red-200 text-red-800',
        blue: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    return (
        <div className={`p-2 rounded-lg border flex items-center gap-2 text-xs ${colorClasses[color]}`}>
            <span className={`font-bold`}>{value}</span>
            <span className="text-zinc-600">{label}</span>
            {date && <span className="text-zinc-500 ml-auto">{new Date(date).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</span>}
        </div>
    )
}

// ====== PAGE ======
export function AccountDetailPageContent(){
  const router = useRouter();
  const params = useParams();
  
  if (!params || !params.accountId) {
    notFound();
  }
  const accountId = params.accountId as string;

  const { data: santaData, setData, saveCollection, saveAllCollections, currentUser } = useData();
  const { upsertPosTactic, catalog, plv } = usePosTacticsService();
  const [isEnriching, setIsEnriching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewTacticOpen, setIsNewTacticOpen] = useState(false);

  const { account, party, unifiedActivity, kpis, owner, distributor, rollup } = useMemo(() => {
    if (!santaData || !accountId) return { account: null, party: null, unifiedActivity: [], kpis: null, owner: null, distributor: null, rollup: null };
    
    const acc = santaData.accounts.find(a => a.id === accountId);
    if (!acc) return { account: null, party: null, unifiedActivity: [], kpis: null, owner: null, distributor: null, rollup: null };

    const pty = santaData.parties.find(p => p.id === acc.partyId);
    
    const interactions = (santaData.interactions || []).filter(i => i.accountId === accountId);
    const orders = (santaData.ordersSellOut || []).filter(o => o.accountId === accountId);

    const unified: (InteractionType | OrderSellOut)[] = [...interactions, ...orders];
    unified.sort((a,b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
      
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);
    const kpiData = computeAccountKPIs({
        data: santaData,
        accountId: acc.id,
        startIso: startDate.toISOString(),
        endIso: endDate.toISOString()
    });

    const rollupData = computeAccountRollup(acc.id, santaData);

    const own = accountOwnerDisplay(acc, santaData.users, santaData.partyRoles);
    const dist = getDistributorForAccount(acc, santaData.partyRoles, santaData.parties);

    return { account: acc, party: pty, unifiedActivity: unified, kpis: kpiData, owner: own, distributor: dist, rollup: rollupData };
  }, [accountId, santaData]);

  const handleEnrich = async () => {
    if (!account || !party || !santaData) return;
    setIsEnriching(true);
    try {
        const enrichedData = await enrichAccount({
            accountName: account.name,
            address: party.billingAddress?.address,
            city: party.billingAddress?.city,
        });

        const updatedAccount = { 
            ...account, 
            subType: enrichedData.subType,
            notes: enrichedData.notes,
        };

        const currentTags = new Set(party.tags || []);
        enrichedData.tags.forEach(tag => currentTags.add(tag));
        const updatedParty = {
            ...party,
            tags: Array.from(currentTags),
        }
        
        await saveAllCollections({ accounts: [updatedAccount], parties: [updatedParty] });

    } catch (error) {
        console.error("Error enriching account:", error);
        alert("No se pudo enriquecer la cuenta.");
    } finally {
        setIsEnriching(false);
    }
  };

  const handleUpdateAccount = async (payload: any) => {
    if (!account || !party || !santaData) return;
    
    const updatedAccount = { ...account, name: payload.name, type: payload.type, city: payload.city };
    
    const emails = [...(party.emails ?? [])];
    const mainEmail = emails.find(c => c.isPrimary);
    if (mainEmail) mainEmail.value = payload.mainContactEmail;
    else if (payload.mainContactEmail) emails.push({ value: payload.mainContactEmail, isPrimary: true, source: 'CRM', verified: false, updatedAt: new Date().toISOString() });
    
    const phones = [...(party.phones ?? [])];
    const mainPhone = phones.find(c => c.isPrimary);
    if(mainPhone) mainPhone.value = payload.phone;
    else if (payload.phone) phones.push({ value: payload.phone, isPrimary: true, source: 'CRM', verified: false, updatedAt: new Date().toISOString() });

    const updatedParty = { ...party, legalName: payload.name, tradeName: payload.name, emails, phones, billingAddress: { address: payload.address, city: payload.city } };

    await saveAllCollections({ accounts: [updatedAccount], parties: [updatedParty] });
    setIsEditing(false);
  };
  
    const handleSaveTactic = async (tacticData: Omit<PosTactic, 'id' | 'createdAt' | 'createdById'>) => {
        try {
            await upsertPosTactic(tacticData);
            setIsNewTacticOpen(false);
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        }
    };

  const getDaysSinceLastOrderColor = (days?: number): 'green' | 'amber' | 'red' => {
      if (days === undefined) return 'amber';
      if (days <= 30) return 'green';
      if (days <= 60) return 'amber';
      return 'red';
  }

  if (!santaData) return <div className="p-6 text-center">Cargando datos...</div>;
  if (!account || !party || !kpis) return <div className="p-6 text-center">Cuenta no encontrada.</div>;

  const mainEmail = (party.emails ?? []).find(e => e.isPrimary);
  const mainPhone = (party.phones ?? []).find(p => p.isPrimary);
  
  return (
    <div className="bg-zinc-50 flex-grow">
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Header Card */}
        <SBCard title="">
          <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl" style={{backgroundColor:SB_COLORS.primary.teal}}/>
                    <div>
                      <h1 className="text-xl font-bold text-zinc-900">{account.name}</h1>
                      <div className="text-sm text-zinc-600">{party.billingAddress?.city} · {account.type}{account.subType && ` (${account.subType})`} · <span className="font-medium">{account.stage}</span></div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                        <Chip color={getDaysSinceLastOrderColor(kpis.daysSinceLastOrder)}>Último pedido hace {kpis.daysSinceLastOrder} días</Chip>
                        <Chip>Última visita hace {kpis.daysSinceLastVisit} días</Chip>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/accounts" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
                        <ChevronLeft size={16} className="sb-icon" /> Volver a Cuentas
                    </Link>
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
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 p-4">
                <KPI label="Unidades vendidas" value={kpis.unitsSold} suffix="uds."/>
                <KPI label="Nº Pedidos" value={kpis.orderCount} />
                <KPI label="Ticket medio" value={formatEUR(kpis.avgTicket)} />
                <KPI label="Días sin Pedido" value={kpis.daysSinceLastOrder ?? '—'} trend={kpis.daysSinceLastOrder && kpis.daysSinceLastOrder > 30 ? 'down' : undefined} />
                <KPI label="Visita→Pedido" value={kpis.visitToOrderRate ?? 0} suffix="%" trend={kpis.visitToOrderRate && kpis.visitToOrderRate >=50 ? 'up':'down'} />
                <KPI label="Nº Visitas" value={kpis.visitsCount} />
              </div>
            </SBCard>

            {/* Últimos pedidos */}
            <SBCard title="Actividad Reciente">
              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
                {unifiedActivity.slice(0,15).map((act, i)=> {
                  if ('lines' in act) { // Is OrderSellOut
                    const order = act as OrderSellOut;
                    return (
                      <div key={order.id} className="grid grid-cols-[auto_1fr_2fr_1fr] items-center gap-3 px-4 py-3 hover:bg-zinc-50">
                          <ShoppingCart className="h-5 w-5 text-emerald-600"/>
                          <div>
                              <div className="text-sm text-zinc-800 font-semibold">{formatEUR(orderTotal(order))}</div>
                              <div className="text-xs text-zinc-500">{formatDate(String(order.createdAt))}</div>
                          </div>
                          <div className="text-sm text-zinc-800 col-span-2">{(order.lines || []).map(l => `${l.qty} ${l.uom || 'uds'} de ${santaData.products.find(p=>p.sku === l.sku)?.name}`).join(', ')}</div>
                      </div>
                    )
                  }
                  const int = act as InteractionType;
                  const Icon = interactionIcons[int.kind] || FileText;
                  return (
                      <div key={int.id} className="grid grid-cols-[auto_1fr] items-start gap-3 px-4 py-3 hover:bg-zinc-50">
                        <Icon className="sb-icon h-5 w-5 text-zinc-500 mt-0.5"/>
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
                <Row label="Contacto Principal" icon={User}>{(party.people ?? [])[0]?.name || '—'}<br/><span className="text-xs text-zinc-500">{mainEmail?.value}</span></Row>
                <Row label="Teléfono" icon={Phone}>{mainPhone?.value}</Row>
                <Row label="Dirección" icon={MapPin}>{party.billingAddress?.address}</Row>
                <Row label="Email Facturación" icon={Mail}>{(party.emails ?? []).find(c => !c.isPrimary)?.value}</Row>
                <hr className="my-2"/>
                {owner && <Row label="Comercial" icon={Briefcase}>{owner}</Row>}
                {distributor && <Row label="Distribuidor" icon={Boxes}>{distributor.name}</Row>}
                <Row label="CIF" icon={Building2}>{party.taxId}</Row>
                <hr className="my-2"/>
                 <Row label="Sub-tipo" icon={Tag}>{account.subType}</Row>
                 <Row label="Horario" icon={Clock}>{(party as any).openingHours || 'No disponible'}</Row>
                 <Row label="Notas IA" icon={Sparkles}><span className="italic">“{account.notes}”</span></Row>
                 <Row label="Etiquetas" icon={Tag}>
                    <div className="flex flex-wrap gap-1">
                        {(party.tags || []).map(t => <Chip key={t}>{t}</Chip>)}
                    </div>
                </Row>
                <div className="mt-4 flex justify-between">
                    <SBButton variant="secondary" onClick={handleEnrich} disabled={isEnriching}>
                        <Sparkles size={14} className="sb-icon"/> {isEnriching ? 'Analizando...' : 'Enriquecer con IA'}
                    </SBButton>
                    <SBButton variant="secondary" onClick={() => setIsEditing(true)}>
                        <Edit size={14} className="sb-icon"/> Editar Cuenta
                    </SBButton>
                </div>
              </div>
            </SBCard>
            {rollup && (
                <SBCard title="Estado de Marketing">
                    <div className="p-4 space-y-2 relative">
                        <RollupBadge label="Activaciones Activas" value={rollup.activeActivations} color={rollup.activeActivations > 0 ? "blue" : "zinc"} date={rollup.lastActivationAt}/>
                        <RollupBadge label="Promociones Activas" value={rollup.activePromotions} color={rollup.activePromotions > 0 ? "amber" : "zinc"} />
                        
                        <SBButton 
                          size="sm"
                          className="sb-icon absolute -bottom-2 -right-2 rounded-full h-10 w-10 !p-0"
                          onClick={() => setIsNewTacticOpen(true)}
                        >
                            <Plus size={20} className="sb-icon" />
                        </SBButton>
                    </div>
                </SBCard>
            )}
          </aside>
        </main>
      </div>

       {isEditing && (
            <SBFlowModal
                open={isEditing}
                variant="editAccount"
                onClose={() => setIsEditing(false)}
                accounts={[]} 
                onSearchAccounts={async()=>[]} 
                onCreateAccount={async()=>({} as Account)} 
                onSubmit={handleUpdateAccount}
                defaults={{
                    id: account.id,
                    name: account.name,
                    city: party.billingAddress?.city || '',
                    address: party.billingAddress?.address || '',
                    type: account.type,
                    mainContactName: (party.people ?? [])[0]?.name || '',
                    mainContactEmail: mainEmail?.value || '',
                    phone: mainPhone?.value || '',
                    billingEmail: (party.emails ?? []).find(e => !e.isPrimary)?.value || '',
                }}
            />
        )}
        
        {isNewTacticOpen && santaData && (
            <NewPosTacticDialog
                open={isNewTacticOpen}
                onClose={() => setIsNewTacticOpen(false)}
                onSave={handleSaveTactic}
                tacticBeingEdited={null}
                accounts={[account]}
                costCatalog={catalog}
                plvInventory={plv}
            />
        )}
    </div>
  );
}

    

    
