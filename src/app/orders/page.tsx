
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { OrderSellOut, Account, User, Distributor, Stage, OrderLine, Product, Lot, OrderStatus, SantaData, AccountRef, StockMove, InventoryItem, Shipment } from '@/domain/ssot';
import { orderTotal } from '@/domain/ssot';
import { applyStockMoves } from '@/domain/inventory.helpers';
import { Plus, Search, Filter, Calendar, DollarSign, User as UserIcon, Truck, BrainCircuit, X, MoreHorizontal, FileText, Copy, XCircle, Building2, Edit, Check, AlertTriangle, Download, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { DownloadDocButton } from '@/components/ui/DownloadDocButton';
import { listLots } from '@/features/production/ssot-bridge';
import { SB_COLORS, hexToRgba, STATUS_STYLES, SBButton } from '@/components/ui/ui-primitives';
import { SBFlowModal } from '@/features/quicklog/components/SBFlows';
import type { Variant } from '@/features/quicklog/components/SBFlows';
import { generateNextOrder, Channel } from '@/lib/codes';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { NewCustomerCelebration } from '@/components/ui/NewCustomerCelebration';


const formatEUR = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

// =======================
//      SUB-COMPONENTS
// =======================

function computeConsumptionForecast(accountId: string, allOrders: OrderSellOut[]): { cycleDays: number, avgOrderSize: number, nextOrderDate: Date } | null {
  const accountOrders = allOrders
    .filter(o => o.accountId === accountId && o.status === 'confirmed' && o.lines.length > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (accountOrders.length < 2) return null;

  const deltas: number[] = [];
  for (let i = 1; i < accountOrders.length; i++) {
    const t1 = new Date(accountOrders[i-1].createdAt).getTime();
    const t2 = new Date(accountOrders[i].createdAt).getTime();
    deltas.push((t2 - t1) / (1000 * 3600 * 24));
  }
  const cycleDays = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;

  const totalUnits = accountOrders.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.qty, 0), 0);
  const avgOrderSize = totalUnits / accountOrders.length;
  
  const lastOrderDate = new Date(accountOrders[accountOrders.length - 1].createdAt);
  const nextOrderDate = new Date(lastOrderDate.getTime() + cycleDays * 1000 * 3600 * 24);

  return { cycleDays, avgOrderSize, nextOrderDate };
}

function ForecastModal({ accountId, allOrders, onClose }: { accountId: string, allOrders: OrderSellOut[], onClose: () => void }) {
    const forecast = useMemo(() => computeConsumptionForecast(accountId, allOrders), [accountId, allOrders]);
    const { data } = useData();
    const account = data?.accounts.find(a => a.id === accountId);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2"><BrainCircuit size={20} /> Pronóstico de Consumo</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <p className="text-sm text-zinc-600 mb-4">Análisis del historial de pedidos para <strong>{account?.name}</strong>.</p>
                
                {forecast ? (
                    <div className="space-y-3">
                        <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">Ciclo de Recompra</p>
                            <p className="text-2xl font-bold">{forecast.cycleDays.toFixed(1)} <span className="text-base font-normal text-zinc-600">días</span></p>
                        </div>
                        <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-xs uppercase tracking-wide text-zinc-500">Pedido Promedio</p>
                            <p className="text-2xl font-bold">{forecast.avgOrderSize.toFixed(1)} <span className="text-base font-normal text-zinc-600">cajas/uds</span></p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
                            <p className="text-sm font-medium text-yellow-800">Próximo pedido estimado para el:</p>
                            <p className="text-xl font-bold text-yellow-900 mt-1">{formatDate(forecast.nextOrderDate.toISOString())}</p>
                            <p className="text-xs text-yellow-700 mt-2">Recomendación: Contactar al cliente unos días antes de esta fecha para asegurar el stock.</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-zinc-600">No hay suficientes datos (se necesitan al menos 2 pedidos confirmados) para generar un pronóstico.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusSelector({ status, onChange }: { status: OrderStatus, onChange: (newStatus: OrderStatus) => void }) {
    const style = STATUS_STYLES[status] || STATUS_STYLES.open;
    return (
        <select
            value={status}
            onChange={(e) => onChange(e.target.value as OrderStatus)}
            className={`text-xs font-bold px-2 py-1 rounded-full w-28 text-center transition-all appearance-none outline-none cursor-pointer ${style.bg} ${style.color}`}
            style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1em',
                paddingRight: '2rem',
            }}
        >
            {Object.entries(STATUS_STYLES).map(([key, { label }]) => (
                <option key={key} value={key} className="bg-white text-black">{label}</option>
            ))}
        </select>
    );
}


function Tabs({ active, setActive, tabs, accentColor }: { active: string; setActive: (id: string) => void; tabs: {id: string, label: string}[], accentColor: string }) {
  return (
    <div className="border-b border-zinc-200">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${ active === tab.id
                ? 'border-sb-cobre text-sb-cobre'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`
            }
            style={active === tab.id ? { borderColor: accentColor, color: accentColor } : {}}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}


// =======================
//        MAIN PAGE
// =======================

function OrdersDashboard() {
  const { data: SantaData, setData, currentUser } = useData();
  const [modalVariant, setModalVariant] = useState<Variant | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<OrderSellOut | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [userFilter, setUserFilter] = useState('');
  const [forecastAccountId, setForecastAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'propia' | 'sellout'>('propia');
  const [showCelebrationFor, setShowCelebrationFor] = useState<string | null>(null);


  const { ordersSellOut, accounts, users, distributors, products, inventory, stockMoves } = SantaData || {};
  const productMap: Map<string, Product> = useMemo(() => new Map(products?.map(p => [p.sku, p])), [products]);

  const handleEditOrder = (order: OrderSellOut) => {
    const payload = {
        ...order,
        account: accounts?.find(a => a.id === order.accountId)?.name || '',
        items: order.lines,
    };
    setOrderToEdit(payload as any);
    setModalVariant('createOrder'); // Re-using for now, ideally 'editOrder'
  }

  const handleNewOrder = () => {
    setOrderToEdit(null);
    setModalVariant('createOrder');
  }

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (!SantaData) return;
    const updatedOrders = SantaData.ordersSellOut.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setData({ ...SantaData, ordersSellOut: updatedOrders });
  };
  
  const handleDuplicateOrder = (orderToDuplicate: OrderSellOut) => {
      if (!SantaData || !currentUser) return;
      const account = accounts?.find(a => a.id === orderToDuplicate.accountId);
      
      const newOrderId = generateNextOrder(
        SantaData.ordersSellOut.map(o => o.id),
        orderToDuplicate.biller === 'PARTNER' ? 'DIST' : 'SB',
        new Date()
      );

      const newOrder: OrderSellOut = {
          ...orderToDuplicate,
          id: newOrderId,
          createdAt: new Date().toISOString(),
          status: 'open',
          userId: currentUser.id,
          biller: orderToDuplicate.biller,
      };
      setData({ ...SantaData, ordersSellOut: [newOrder, ...SantaData.ordersSellOut] });
  };
  
  const handleCancelOrder = (orderId: string) => {
      if(confirm('¿Estás seguro de que quieres cancelar este pedido?')) {
          handleStatusChange(orderId, 'cancelled');
      }
  };

  const handleModalSubmit = (payload: any) => {
    if (!SantaData || !currentUser) return;

    if (orderToEdit) { // Editing
        const updatedOrder: OrderSellOut = {
            ...orderToEdit,
            lines: payload.items as OrderLine[],
            notes: payload.note || undefined,
            totalAmount: orderTotal({ lines: payload.items } as OrderSellOut),
        };
        const updatedOrders = SantaData.ordersSellOut.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        setData({ ...SantaData, ordersSellOut: updatedOrders });
    } else { // Creating
        const account = SantaData.accounts.find(a => a.name === payload.account);
        if (!account) return; 

        // Check if it's the first order for this account
        const isNewCustomerOrder = !SantaData.ordersSellOut.some(o => o.accountId === account.id);

        const isSellout = payload.channel !== 'propia';
        
        const channelMap: Record<string, Channel> = {
            'propia': 'SB',
            'distribuidor': 'DIST',
            'importador': 'IMP',
            'online': 'ONL'
        }
        const newOrderId = generateNextOrder(
            SantaData.ordersSellOut.map(o => o.id),
            channelMap[payload.channel] || 'SB',
            new Date()
        );
        
        const newOrder: OrderSellOut = {
            id: newOrderId,
            accountId: account.id,
            userId: currentUser.id,
            distributorId: isSellout ? account.distributorId : undefined,
            status: 'open',
            currency: 'EUR',
            createdAt: new Date().toISOString(),
            lines: payload.items as OrderLine[],
            notes: payload.note || undefined,
            source: 'CRM',
            biller: isSellout ? 'PARTNER' : 'SB',
            totalAmount: orderTotal({ lines: payload.items } as OrderSellOut),
        };
        
        const newShipment: Shipment = {
          id: `SHP-${newOrderId}`,
          orderId: newOrderId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          accountId: account.id,
          customerName: account.name,
          addressLine1: account.address,
          city: account.city || '',
          lines: newOrder.lines.map(l => ({
            sku: l.sku,
            name: productMap.get(l.sku)?.name || l.sku,
            qty: l.qty,
            unit: l.unit,
            lotNumber: l.lotIds?.[0]
          }))
        };
        
        let updatedInventory = SantaData.inventory;
        const newStockMoves: StockMove[] = [];
        
        if (!isSellout) {
            payload.items.forEach((line: OrderLine, index: number) => {
                if (line.lotIds && line.lotIds[0]) { // Simplified: takes first lot
                    const move: StockMove = {
                        id: `mv_${newOrderId}_${index}`,
                        sku: line.sku,
                        lotId: line.lotIds[0],
                        qty: line.qty * (line.unit === 'caja' ? (productMap.get(line.sku)?.caseUnits || 1) : 1),
                        uom: 'ud',
                        fromLocation: 'FG/MAIN',
                        toLocation: undefined,
                        reason: 'SHIP',
                        occurredAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        ref: { orderId: newOrderId }
                    };
                    newStockMoves.push(move);
                }
            });
            
            if (newStockMoves.length > 0) {
              updatedInventory = applyStockMoves(SantaData.inventory, newStockMoves, SantaData.products);
            }
        }
        
        setData({ 
            ...SantaData, 
            ordersSellOut: [...SantaData.ordersSellOut, newOrder],
            shipments: [...(SantaData.shipments || []), newShipment],
            inventory: updatedInventory,
            stockMoves: [...(SantaData.stockMoves || []), ...newStockMoves]
        });

        if (isNewCustomerOrder) {
            setShowCelebrationFor(account.name);
        }
    }
    setModalVariant(null);
    setOrderToEdit(null);
  };


  const filteredOrders = useMemo(() => {
    if (!ordersSellOut || !accounts) return [];

    const accountMap = new Map(accounts.map(a => [a.id, a]));

    return ordersSellOut.filter(order => {
        const account = accountMap.get(order.accountId);
        if (!account) return false;
        
        const user = users?.find(u => u.id === order.userId);
        
        const isSellout = order.biller === 'PARTNER';

        if (activeTab === 'propia' && isSellout) return false;
        if (activeTab === 'sellout' && !isSellout) return false;

        const qLower = query.toLowerCase();
        const matchesQuery = !query ||
            account.name.toLowerCase().includes(qLower) ||
            order.id.toLowerCase().includes(qLower) ||
            (user?.name || '').toLowerCase().includes(qLower);

        const matchesStatus = !statusFilter || order.status === statusFilter;
        const matchesUser = !userFilter || order.userId === userFilter;
        
        return matchesQuery && matchesStatus && matchesUser;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  }, [ordersSellOut, accounts, users, query, statusFilter, userFilter, activeTab]);

  if (!SantaData) {
    return <div className="p-6">Cargando...</div>;
  }

  const userOptions = users?.map(u => ({ value: u.id, label: u.name })) || [];
  const statusOptions = (Object.entries(STATUS_STYLES) as Array<[OrderStatus, {label:string}]>)
    .map(([key, { label }]) => ({ value: key, label }));
  
  return (
    <>
    {showCelebrationFor && <NewCustomerCelebration accountName={showCelebrationFor} onClose={() => setShowCelebrationFor(null)} />}
    <ModuleHeader title="Panel de Pedidos" icon={ShoppingCart}>
        <div className="flex items-center gap-2">
            <SBButton
                onClick={handleNewOrder}
                className="flex items-center gap-2">
                <Plus size={16} /> Nuevo Pedido
            </SBButton>
        </div>
    </ModuleHeader>
    <div className="p-4 md:p-6 space-y-6">
      
       <Tabs
        active={activeTab}
        setActive={(id) => setActiveTab(id as any)}
        tabs={[
          {id: 'propia', label: 'Venta Propia'}, 
          {id: 'sellout', label: 'Sell-Out (Distribuidores)'}
        ]}
        accentColor={SB_COLORS.sales}
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, ID de pedido..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as OrderStatus | '')} options={statusOptions} placeholder="Estado" />
        <FilterSelect value={userFilter} onChange={setUserFilter} options={userOptions} placeholder="Comercial" />
      </div>

      <div className="bg-white rounded-2xl border">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
            <span>Cliente</span>
            <span>Responsable</span>
            <span>Canal</span>
            <span>Fecha</span>
            <span className="text-right">Importe</span>
            <span className="text-center">Estado</span>
            <span className="text-right">Acciones</span>
        </div>
        
        {/* Table Body */}
        <div className="divide-y divide-zinc-100">
            {filteredOrders.length > 0 ? (
                filteredOrders.map(order => {
                    const account = accounts?.find(a => a.id === order.accountId);
                    const user = users?.find(u => u.id === order.userId);
                    const distributor = distributors?.find(d => d.id === account?.distributorId);

                    if (!account) return null;
                    
                    const channel = order.biller === 'SB' ? 'Venta Propia' : distributor?.name || 'Distribuidor';

                    return (
                        <div key={order.id} className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center text-sm hover:bg-zinc-50/70 transition-colors">
                            {/* Cliente */}
                            <div className="flex items-center gap-2">
                                <div>
                                    <Link href={`/accounts/${account.id}`} className="font-semibold text-zinc-800 hover:underline">{account.name}</Link>
                                    <p className="text-xs text-zinc-500">{order.id}</p>
                                </div>
                            </div>
                            {/* Responsable */}
                            <div className="flex items-center gap-2">
                                <UserIcon size={14} className="text-zinc-400" />
                                <span>{user?.name || 'N/A'}</span>
                            </div>
                            {/* Canal */}
                            <div className="flex items-center gap-2">
                                {order.biller !== 'SB' ? <Truck size={14} className="text-zinc-400" /> : <Building2 size={14} className="text-zinc-400" />}
                                <span>{channel}</span>
                            </div>
                            {/* Fecha */}
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-zinc-400" />
                                <span>{formatDate(order.createdAt)}</span>
                            </div>
                            {/* Importe */}
                            <div className="text-right font-medium text-zinc-800">
                                {formatEUR(orderTotal(order))}
                            </div>
                            {/* Estado */}
                            <div className="flex justify-center">
                                <StatusSelector status={order.status} onChange={(newStatus) => handleStatusChange(order.id, newStatus)} />
                            </div>
                            {/* Acciones */}
                            <div className="relative group">
                                <button className="p-2 text-zinc-500 hover:bg-zinc-200 rounded-md">
                                    <MoreHorizontal size={16} />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg hidden group-hover:block z-20">
                                    <Link href={`/accounts/${account.id}`} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-zinc-100">
                                        <FileText size={14} /> Ver Cuenta
                                    </Link>
                                    <button onClick={() => handleEditOrder(order)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-zinc-100"><Edit size={14} /> Editar</button>
                                    <button onClick={() => handleDuplicateOrder(order)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-zinc-100"><Copy size={14} /> Duplicar</button>
                                    <button onClick={() => setForecastAccountId(account.id)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-zinc-100"><BrainCircuit size={14}/> Pronóstico</button>
                                    <DownloadDocButton
                                        docType="delivery_note"
                                        order={order as any}
                                        account={account}
                                        products={products}
                                        label="Descargar Albarán"
                                        filename={`ALBARAN-${order.id}.pdf`}
                                    >
                                        <div className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-zinc-100">
                                            <Download size={14} /> Descargar Albarán
                                        </div>
                                    </DownloadDocButton>
                                    <button onClick={() => handleCancelOrder(order.id)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"><XCircle size={14} /> Cancelar</button>
                                </div>
                            </div>
                        </div>
                    )
                })
            ) : (
                 <p className="text-zinc-500 text-center py-8">No se encontraron pedidos con estos filtros.</p>
            )}
        </div>
      </div>

      {modalVariant && SantaData && currentUser && (
        <SBFlowModal
            open={!!modalVariant}
            variant={modalVariant}
            onClose={() => { setModalVariant(null); setOrderToEdit(null); }}
            accounts={SantaData.accounts as AccountRef[]}
            onSearchAccounts={async(q) => SantaData.accounts.filter(a => a.name.toLowerCase().includes(q.toLowerCase())) as AccountRef[]}
            onCreateAccount={async (d) => {
                 const newAccount: Account = { 
                     id: `acc_local_${Date.now()}`,
                     name: d.name, city: d.city, stage: 'POTENCIAL',
                     type: d.accountType || 'HORECA',
                     mode: { mode: 'PROPIA_SB', ownerUserId: currentUser.id, biller: 'SB' },
                     createdAt: new Date().toISOString()
                 };
                 setData({...SantaData, accounts: [...SantaData.accounts, newAccount]});
                 return newAccount as AccountRef;
            }}
            defaults={orderToEdit}
            onSubmit={handleModalSubmit}
        />
      )}

      {forecastAccountId && SantaData && (
          <ForecastModal 
            accountId={forecastAccountId}
            allOrders={SantaData.ordersSellOut}
            onClose={() => setForecastAccountId(null)}
          />
      )}
    </div>
    </>
  );
}

function FilterSelect<T extends string>({ value, onChange, options, placeholder }: { value: T, onChange: (v: T | '') => void, options: { value: T, label: string }[], placeholder: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | '')}
        className="appearance-none w-full pl-3 pr-8 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <Filter className="h-4 w-4 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}


export default function OrdersPage() {
    return (
        <OrdersDashboard />
    )
}
