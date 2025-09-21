

"use client";

import React, { useMemo, useState, useTransition } from 'react';
import { useData } from '@/lib/dataprovider';
import { Download, Plus, Search, FileWarning, PackageCheck, FileText, Banknote, CheckCircle, Boxes, Loader2 } from 'lucide-react';
import type { OrderSellOut, Account, User, OrderStatus, PartyRole, CustomerData, SantaData } from '@/domain/ssot';
import { orderTotal } from '@/lib/sb-core';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { SBFlowModal } from '@/features/quicklog/components/SBFlows';
import { generateNextOrder } from '@/lib/codes';
import { consignmentOnHandByAccount, consignmentTotalUnits } from "@/lib/consignment-and-samples";
import { checkOrderStock } from '@/lib/inventory';
import { updateOrderStatus } from '@/app/(app)/orders/actions';

type Tab = 'directa' | 'colocacion';

function KPI({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string | number, color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-sb-neutral-200 flex items-start gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color }}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-sb-neutral-900">{value}</p>
                <p className="text-sm text-sb-neutral-600">{label}</p>
            </div>
        </div>
    )
}

function FilterPill({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm bg-white border border-zinc-200 rounded-md pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-yellow-300"
      aria-label={placeholder}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: 'open', label: 'Borrador' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'shipped', label: 'Enviado' },
    { value: 'invoiced', label: 'Facturado' },
    { value: 'paid', label: 'Pagado' },
    { value: 'cancelled', label: 'Cancelado' },
    { value: 'lost', label: 'Perdido' },
];

function StatusSelector({ order, onStatusChange }: { order: OrderSellOut; onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>; }) {
    const [isPending, startTransition] = useTransition();

    const statusMap: Record<OrderStatus, { label: string; className: string }> = {
        open: { label: 'Borrador', className: 'bg-zinc-100 text-zinc-700' },
        confirmed: { label: 'Confirmado', className: 'bg-blue-100 text-blue-700' },
        shipped: { label: 'Enviado', className: 'bg-cyan-100 text-cyan-700' },
        invoiced: { label: 'Facturado', className: 'bg-emerald-100 text-emerald-700' },
        paid: { label: 'Pagado', className: 'bg-green-100 text-green-700' },
        cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
        lost: { label: 'Perdido', className: 'bg-neutral-200 text-neutral-600' },
    };

    const style = statusMap[order.status] || statusMap.open;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as OrderStatus;
        startTransition(async () => {
            await onStatusChange(order.id, newStatus);
        });
    };

    return (
        <div className="relative flex items-center gap-2">
            <select
                value={order.status}
                onChange={handleChange}
                disabled={isPending}
                className={`appearance-none px-2.5 py-1 text-xs font-semibold rounded-full outline-none focus:ring-2 ring-offset-1 ring-blue-400 transition-colors ${style.className}`}
            >
                {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
        </div>
    );
}

function Tabs({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (tab: Tab) => void }) {
    const tabs: {id: Tab, label: string}[] = [
        { id: 'directa', label: 'Venta Directa' },
        { id: 'colocacion', label: 'Colocación (Sell-Out)' },
    ];
    return (
        <div className="border-b border-zinc-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                    ${ activeTab === tab.id
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                    }`
                    }
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                    {tab.label}
                </button>
                ))}
            </nav>
        </div>
    )
}

function exportToCsv(filename: string, rows: (string | number)[][]) {
    const processRow = (row: (string|number)[]) => row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    }).join(',');

    const csvContent = rows.map(processRow).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

const accountHref = (id: string) => `/accounts/${id}`;

export default function OrdersDashboard() {
  const { data, setData, saveAllCollections } = useData();
  const [activeTab, setActiveTab] = useState<Tab>('directa');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

  const { ordersSellOut, accounts, users, partyRoles, stockMoves, inventory, products } = data || { ordersSellOut: [], accounts: [], users: [], partyRoles: [], stockMoves: [], inventory: [], products: [] };
  
  const consByAcc = useMemo(() => consignmentOnHandByAccount(stockMoves || []), [stockMoves]);
  const consTotals = useMemo(() => consignmentTotalUnits(consByAcc), [consByAcc]);
  
  const enrichedOrders = useMemo(() => {
    if (!ordersSellOut || !accounts || !partyRoles || !users) return [];
    
    const accountMap = new Map((accounts || []).map((acc: Account) => [acc.id, acc]));
    const userMap = new Map((users || []).map((user: User) => [user.id, user]));
    const rolesMap = new Map();
    (partyRoles || []).forEach((role: PartyRole) => {
        if(role.role === 'CUSTOMER') {
            rolesMap.set(role.partyId, role.data as CustomerData);
        }
    });

    return ordersSellOut.map(order => {
        const account = accountMap.get(order.accountId);
        if (!account) return null;

        const customerData = rolesMap.get(account.partyId);
        const billerId = customerData?.billerId || 'SB'; // Default to 'SB' if not found
        const owner = userMap.get(account.ownerId);

        return {
            ...order,
            account,
            owner,
            billerId
        };
    }).filter((o): o is NonNullable<typeof o> => !!o);
  }, [ordersSellOut, accounts, users, partyRoles]);


  const filteredOrders = useMemo(() => {
    return enrichedOrders
      .filter((order) => {
        const isVentaDirecta = order.billerId === 'SB';
        if (activeTab === 'directa' && !isVentaDirecta) return false;
        if (activeTab === 'colocacion' && isVentaDirecta) return false;

        const matchesSearch =
          !searchTerm ||
          (order.docNumber && order.docNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.account && order.account.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = !statusFilter || order.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [enrichedOrders, searchTerm, statusFilter, activeTab]);

  const kpis = useMemo(() => {
    const relevantOrders = enrichedOrders.filter(order => {
        const isVentaDirecta = order.billerId === 'SB';
        return activeTab === 'directa' ? isVentaDirecta : !isVentaDirecta;
    });

    return {
        pendingConfirmation: relevantOrders.filter(o => o.status === 'open').length,
        pendingShipment: relevantOrders.filter(o => o.status === 'confirmed').length,
        pendingInvoice: relevantOrders.filter(o => o.status === 'shipped').length,
        pendingPayment: relevantOrders.filter(o => o.status === 'invoiced').length,
        totalConsignment: Object.values(consTotals).reduce((sum, current) => sum + current, 0),
    }
  }, [enrichedOrders, activeTab, consTotals]);

  const handleExport = () => {
      const headers = ['id', 'fecha', 'cliente', 'total', 'estado', 'canal'];
      const rows = filteredOrders.map(order => [
          order.docNumber || order.id,
          new Date(order.createdAt).toISOString().split('T')[0],
          order.account.name,
          orderTotal(order as OrderSellOut),
          order.status,
          order.source || 'N/A'
      ]);
      exportToCsv(`pedidos-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  }

  const handleCreateOrder = (payload: any) => {
    if (!data) return;

    if (!payload.account) {
        console.error("No account selected or created for the new order.");
        return;
    }
    
    const targetAccount = payload.newAccount ? payload.newAccount : data.accounts.find(a => a.name === payload.account);

    if (!targetAccount) {
        console.error("Could not find or create the account for the order.");
        return;
    }
    
    const newOrder: OrderSellOut = {
        id: `ord_${Date.now()}`,
        docNumber: generateNextOrder((data.ordersSellOut || []).map(o=>o.docNumber).filter(Boolean) as string[], payload.channel, new Date()),
        accountId: targetAccount.id,
        lines: payload.items,
        status: 'open',
        createdAt: new Date().toISOString(),
        currency: 'EUR',
        notes: payload.note,
        source: 'MANUAL'
    };
    
    const collectionsToSave: Partial<SantaData> = {
        ordersSellOut: [...(data.ordersSellOut || []), newOrder]
    };

    if (payload.newAccount && payload.newParty) {
        collectionsToSave.accounts = [...(data.accounts || []), payload.newAccount];
        collectionsToSave.parties = [...(data.parties || []), payload.newParty];
    }
    
    saveAllCollections(collectionsToSave);
    setIsCreateOrderOpen(false);
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!data) return;
  
    // Optimistic UI update
    const originalOrders = data.ordersSellOut;
    setData(prevData => {
        if (!prevData) return null;
        const updatedOrders = prevData.ordersSellOut.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
        return { ...prevData, ordersSellOut: updatedOrders };
    });

    try {
        if (newStatus === 'confirmed') {
            const order = enrichedOrders.find(o => o.id === orderId);
            if (order) {
                const shortages = checkOrderStock(order as OrderSellOut, inventory || [], products || []);
                if (shortages.length > 0) {
                    const shortageMessage = shortages.map(s => `${s.qtyShort} uds de ${s.sku}`).join(', ');
                    console.warn(`Falta de stock para el pedido ${order.docNumber || order.id}:\nFaltan ${shortageMessage}.\n\nEl pedido se confirmará de todos modos (backorder).`);
                }
            }
        }
        await updateOrderStatus(orderId, newStatus);
        
    } catch (error) {
        console.error("Failed to update order status:", error);
        setData(prevData => prevData ? ({ ...prevData, ordersSellOut: originalOrders }) : null);
    }
  };


  return (
    <>
      <ModuleHeader title="Gestión de Pedidos" icon={ShoppingCart}>
        <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-md px-3 py-1.5 hover:bg-zinc-50" aria-label="Exportar datos a CSV">
              <Download size={14} /> Exportar
            </button>
            <button onClick={() => setIsCreateOrderOpen(true)} className="flex items-center gap-2 text-sm bg-yellow-400 text-zinc-900 font-semibold rounded-md px-3 py-1.5 hover:bg-yellow-500">
              <Plus size={16} /> Nuevo Pedido
            </button>
        </div>
      </ModuleHeader>

      <div className="p-4 md:p-6">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 my-4">
            <KPI icon={FileWarning} label="Pendiente de Confirmar" value={kpis.pendingConfirmation} color="#f59e0b" />
            <KPI icon={PackageCheck} label="Pendiente de Enviar" value={kpis.pendingShipment} color="#3b82f6" />
            <KPI icon={Boxes} label="Unidades en Consigna" value={kpis.totalConsignment} color="#a855f7" />
            <KPI icon={FileText} label="Pendiente de Facturar" value={kpis.pendingInvoice} color="#10b981" />
            <KPI icon={Banknote} label="Pendiente de Cobrar" value={kpis.pendingPayment} color="#8b5cf6" />
        </div>
        
        <div className="mt-4 mb-4 flex items-center gap-3">
            <div className="relative flex-grow">
                <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input 
                    type="text"
                    placeholder="Buscar por ID de pedido o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
                    aria-label="Buscar pedidos"
                />
            </div>
            <FilterPill
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filtrar por estado"
                options={statusOptions}
            />
        </div>
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th scope="col" className="p-3 font-semibold text-zinc-600">Pedido ID</th>
                <th scope="col" className="p-3 font-semibold text-zinc-600">Cliente</th>
                <th scope="col" className="p-3 font-semibold text-zinc-600">Comercial</th>
                <th scope="col" className="p-3 font-semibold text-zinc-600">Fecha</th>
                <th scope="col" className="p-3 font-semibold text-zinc-600 text-right">Total</th>
                <th scope="col" className="p-3 font-semibold text-zinc-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono text-xs font-medium text-zinc-800">{order.docNumber || order.id}</td>
                    <td className="p-3">
                        <div className="flex items-center gap-2">
                            <Link href={accountHref(order.accountId)} className="hover:underline font-medium">
                                {order.account.name || 'N/A'}
                            </Link>
                            {consTotals[order.accountId] > 0 && (
                                <span title={
                                    Object.entries(consByAcc[order.accountId] || {})
                                        .map(([sku, qty]) => `${sku}: ${qty} uds`)
                                        .join("\n")
                                    }
                                    className="text-[10px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 cursor-help"
                                >
                                    Consigna: {consTotals[order.accountId]} uds
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="p-3">{order.owner?.name || 'N/A'}</td>
                    <td className="p-3">{new Date(order.createdAt).toLocaleDateString('es-ES')}</td>
                    <td className="p-3 text-right font-semibold">
                      {orderTotal(order as OrderSellOut).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="p-3">
                      <StatusSelector order={order} onStatusChange={handleStatusChange} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No se encontraron pedidos que coincidan con tu búsqueda.
            </div>
          )}
        </div>
      </div>
      {isCreateOrderOpen && (
        <SBFlowModal
          open={isCreateOrderOpen}
          variant="createOrder"
          onClose={() => setIsCreateOrderOpen(false)}
          accounts={data?.accounts || []}
          onSearchAccounts={async (q) => (data?.accounts || []).filter(a => a.name.toLowerCase().includes(q.toLowerCase()))}
          onCreateAccount={async (d) => { return d as any; }}
          onSubmit={handleCreateOrder}
        />
      )}
    </>
  );
}
