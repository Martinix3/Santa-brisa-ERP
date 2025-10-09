// src/features/orders/components/OrdersDashboard.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Order, OrderStatus, Account } from '@/domain/ssot';
import OrdersTable from './OrdersTable';
import { toast } from 'sonner';
import { firestoreDb } from '@/lib/firebaseClient';
import { doc, updateDoc } from 'firebase/firestore';
import { KPI, SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Package, Truck, FileText, Clock, Plus, Search } from 'lucide-react';
import { FilterSelect, Input } from '@/components/ui';
import { getDistributors } from '@/lib/distributor-helpers';

type MainTab = 'sell-in' | 'sell-out';
type CanalFilter = 'ALL' | 'HORECA' | 'RETAIL' | 'ONLINE' | 'DISTRIBUIDOR' | 'PRIVADA';

const OrdersDashboard = () => {
    const { data } = useData();
    const [activeTab, setActiveTab] = useState<MainTab>('sell-in');
    const [canalFilter, setCanalFilter] = useState<CanalFilter>('ALL');
    const [distributorFilter, setDistributorFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Distribuidores disponibles
    const distribuidores = useMemo(() => {
        if (!data) return [];
        return getDistributors(data);
    }, [data]);

    // Opciones para filtro de canal
    const canalOptions = useMemo(() => [
        { value: 'ALL', label: 'Todos los canales' },
        { value: 'HORECA', label: 'HORECA' },
        { value: 'RETAIL', label: 'RETAIL' },
        { value: 'ONLINE', label: 'Online' },
        { value: 'DISTRIBUIDOR', label: 'Distribuidores' },
        { value: 'PRIVADA', label: 'Ventas Privadas' },
    ], []);

    // Opciones para filtro de distribuidor
    const distributorOptions = useMemo(() => [
        { value: '', label: 'Todos los distribuidores' },
        ...distribuidores.map(d => ({ value: d.id, label: d.name }))
    ], [distribuidores]);

    // Filtrar pedidos
    const filteredOrders = useMemo(() => {
        if (!data) return [];
        
        let orders = data.orders || [];
        
        // Filtro principal: Sell-In vs Sell-Out
        if (activeTab === 'sell-in') {
            orders = orders.filter((o: Order) => o.channel === 'DIRECTA');
            
            // Filtro por canal (solo en Sell-In)
            if (canalFilter !== 'ALL') {
                orders = orders.filter((o: Order) => {
                    const account = data.accounts?.find((a: Account) => a.id === o.accountId);
                    
                    if (canalFilter === 'ONLINE') {
                        return o.source === 'Shopify';
                    } else if (canalFilter === 'DISTRIBUIDOR') {
                        return account?.accountType === 'DISTRIBUIDOR';
                    } else {
                        // HORECA, RETAIL, PRIVADA
                        return account?.accountType === canalFilter;
                    }
                });
            }
            
            // Si canal es DISTRIBUIDOR y hay filtro de distribuidor específico
            if (canalFilter === 'DISTRIBUIDOR' && distributorFilter) {
                orders = orders.filter((o: Order) => {
                    const account = data.accounts?.find((a: Account) => a.id === o.accountId);
                    return account?.distributorId === distributorFilter;
                });
            }
        } else {
            // Sell-Out: COLOCACION
            orders = orders.filter((o: Order) => o.channel === 'COLOCACION');
            
            // En Sell-Out, filtrar por distribuidor si está seleccionado
            if (distributorFilter) {
                orders = orders.filter((o: Order) => {
                    const account = data.accounts?.find((a: Account) => a.id === o.accountId);
                    return account?.distributorId === distributorFilter;
                });
            }
        }
        
        // Búsqueda general
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            orders = orders.filter((o: Order) => {
                const account = data.accounts?.find((a: Account) => a.id === o.accountId);
                return (
                    o.id.toLowerCase().includes(query) ||
                    account?.name.toLowerCase().includes(query) ||
                    o.status.toLowerCase().includes(query)
                );
            });
        }
        
        return orders;
    }, [data, activeTab, canalFilter, distributorFilter, searchQuery]);

    // KPIs basados en pedidos filtrados
    const kpis = useMemo(() => {
        const pendingConfirmation = filteredOrders.filter((o: Order) => o.status === 'ABIERTO').length;
        const pendingShipment = filteredOrders.filter((o: Order) => o.status === 'EN_PROCESO').length;
        const pendingInvoice = filteredOrders.filter((o: Order) => o.status === 'SERVIDO').length;
        const pendingPayment = filteredOrders.filter((o: Order) => o.status === 'FACTURADO').length;
        
        return { pendingConfirmation, pendingShipment, pendingInvoice, pendingPayment };
    }, [filteredOrders]);

    // Cambiar status de pedido
    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        if (!firestoreDb) {
            toast.error('No conectado a Firestore');
            return;
        }

        try {
            const orderRef = doc(firestoreDb, 'orders', orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            toast.success(`Pedido actualizado a ${newStatus}`);
        } catch (error) {
            console.error('Error actualizando pedido:', error);
            toast.error('Error al actualizar el pedido');
        }
    };

    return (
        <div className="p-6 bg-background min-h-full">
            {/* Header con botón crear pedido */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
                    <p className="text-sm text-slate-600">
                        Gestión completa de pedidos Sell-In y Sell-Out
                    </p>
                </div>
                <SBButton className="bg-[#618E8F] hover:bg-[#618E8F]/90 text-white">
                    <Plus size={16} className="mr-2" />
                    Nuevo Pedido
                </SBButton>
            </div>

            {/* Pestañas principales: Sell-In / Sell-Out */}
            <div className="flex items-center gap-2 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('sell-in')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'sell-in'
                            ? 'border-[#618E8F] text-[#618E8F]'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Sell-In
                </button>
                <button
                    onClick={() => setActiveTab('sell-out')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'sell-out'
                            ? 'border-[#618E8F] text-[#618E8F]'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Sell-Out
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <KPI 
                    icon={Clock} 
                    label="Pendiente de Confirmar" 
                    value={kpis.pendingConfirmation} 
                    color="#3b82f6" 
                />
                <KPI 
                    icon={Package} 
                    label="Pendiente de Enviar" 
                    value={kpis.pendingShipment} 
                    color="#618E8F" 
                />
                <KPI 
                    icon={Truck} 
                    label="Pendiente de Facturar" 
                    value={kpis.pendingInvoice} 
                    color="#10b981" 
                />
                <KPI 
                    icon={FileText} 
                    label="Pendiente de Cobrar" 
                    value={kpis.pendingPayment} 
                    color="#C18A5A" 
                />
            </div>

            {/* Filtros dinámicos según pestaña activa */}
            <div className="flex items-center gap-3 mb-6">
                {/* Barra de búsqueda siempre visible */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por ID, cliente..."
                        className="pl-9"
                    />
                </div>

                {activeTab === 'sell-in' ? (
                    // Filtros Sell-In
                    <>
                        <FilterSelect 
                            value={canalFilter} 
                            onChange={(val) => {
                                setCanalFilter(val as CanalFilter);
                                setDistributorFilter(''); // Reset distribuidor al cambiar canal
                            }} 
                            options={canalOptions} 
                            placeholder="Canal" 
                        />
                        
                        {/* Filtro por distribuidor solo si canal es DISTRIBUIDOR */}
                        {canalFilter === 'DISTRIBUIDOR' && (
                            <FilterSelect 
                                value={distributorFilter} 
                                onChange={setDistributorFilter} 
                                options={distributorOptions} 
                                placeholder="Distribuidor" 
                            />
                        )}
                    </>
                ) : (
                    // Filtros Sell-Out: Solo distribuidor
                    <FilterSelect 
                        value={distributorFilter} 
                        onChange={setDistributorFilter} 
                        options={distributorOptions} 
                        placeholder="Distribuidor" 
                    />
                )}
            </div>

            {/* Tabla de pedidos */}
            <SBCard noPadding>
                <OrdersTable 
                    orders={filteredOrders.map((order: Order) => {
                        const account = data?.accounts?.find((a: Account) => a.id === order.accountId);
                        return {
                            id: order.id,
                            client: account?.name || order.accountId || 'Sin cliente',
                            date: order.createdAt,
                            status: order.status,
                            total: `${order.total?.toFixed(2) || '0.00'}€`,
                            channel: order.channel === 'DIRECTA' ? 'DIRECTA' : 'COLOCACION'
                        };
                    })}
                    onStatusChange={handleStatusChange}
                />
            </SBCard>

            {/* Info según pestaña */}
            <div className="mt-4 text-xs text-muted-foreground">
                {activeTab === 'sell-in' ? (
                    <p>
                        <strong>Sell-In:</strong> Pedidos de venta directa facturados por Santa Brisa. 
                        Incluye todos los canales (HORECA, RETAIL, Online, Distribuidores, Privadas).
                    </p>
                ) : (
                    <p>
                        <strong>Sell-Out:</strong> Pedidos de colocación en distribuidores (estadístico). 
                        Visualiza las ventas desde distribuidores hacia el punto de venta final.
                    </p>
                )}
            </div>
        </div>
    );
};

export default OrdersDashboard;
