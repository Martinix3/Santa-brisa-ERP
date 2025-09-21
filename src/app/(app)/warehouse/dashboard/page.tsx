
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { generateInsights } from '@/ai/flows/generate-insights-flow';
import { SBCard, SBButton, Card, DataTableSB, Button, SB_COLORS } from '@/components/ui/ui-primitives';
import type { Col } from '@/components/ui/ui-primitives';
import { BrainCircuit, Package, DollarSign, Truck, AlertCircle, Clock } from 'lucide-react';
import type { InventoryItem, Shipment, Interaction } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import Link from 'next/link';

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

function StatusPill({status}:{status: Shipment['status']}){
  const map: Record<Shipment['status'], { txt:string, bg:string }> = {
    pending: { txt: "Pendiente", bg: "bg-yellow-100 text-yellow-800" },
    picking: { txt: "En picking", bg: "bg-blue-100 text-blue-800" },
    ready_to_ship: { txt: "Listo", bg: "bg-purple-100 text-purple-800" },
    shipped: { txt: "Enviado", bg: "bg-cyan-100 text-cyan-800" },
    delivered: { txt: "Entregado", bg: "bg-green-100 text-green-800" },
    cancelled: { txt: "Cancelado", bg: "bg-red-100 text-red-800" },
  };
  const s = map[status] || map.pending;
  return <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${s.bg}`}>{s.txt}</span>;
}


function WarehouseDashboardContent({ inventory, shipments }: { inventory: InventoryItem[], shipments: Shipment[] }) {
    const kpis = useMemo(() => {
        const stockUnits = inventory.reduce((sum, item) => sum + item.qty, 0);
        const stockValue = inventory.reduce((sum, item) => sum + (item.qty * 8.5), 0); // Precio coste estimado
        const pendingShipments = shipments.filter(s => s.status === 'pending' || s.status === 'picking').length;

        return {
            stockUnits: stockUnits.toLocaleString('es-ES'),
            stockValue: stockValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }),
            pendingShipments,
        }
    }, [inventory, shipments]);

    const shipmentCols: Col<Shipment>[] = [
        { key: 'id', header: 'Envío', render: r => <Link href={`/warehouse/logistics/${r.id}`} className="font-mono text-xs font-semibold text-sb-verde-mar hover:underline">{r.id}</Link> },
        { key: 'customerName', header: 'Cliente' },
        { key: 'city', header: 'Destino' },
        { key: 'status', header: 'Estado', render: r => <StatusPill status={r.status} /> },
        { key: 'createdAt', header: 'F. Creación', render: r => new Date(r.createdAt).toLocaleDateString('es-ES') },
        { 
            key: 'actions', 
            header: 'Acciones', 
            render: r => (
                 <Link href={`/warehouse/logistics`}>
                    <Button variant="subtle">Ver</Button>
                </Link>
            ) 
        }
    ];

    const lowStockItems = inventory.filter(item => item.qty < 50 && item.sku.startsWith('SB-'));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPI icon={Package} label="Unidades en Stock" value={kpis.stockUnits} color={SB_COLORS.primary.aqua} />
                <KPI icon={DollarSign} label="Valor del Stock" value={kpis.stockValue} color="#0d9488" />
                <KPI icon={Truck} label="Envíos Pendientes" value={kpis.pendingShipments} color="#f59e0b" />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card title="Envíos Recientes">
                         <DataTableSB rows={shipments.slice(0,10)} cols={shipmentCols as any} />
                    </Card>
                </div>
                 <div className="space-y-6">
                     <UpcomingEvents />
                     <Card title="Alertas de Stock Bajo">
                         <div className="p-2 space-y-1">
                             {lowStockItems.length > 0 ? lowStockItems.map(item => (
                                 <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                                     <div>
                                         <p className="font-semibold text-sm text-amber-900">{item.sku}</p>
                                         <p className="text-xs text-amber-700">{item.lotNumber}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="font-bold text-amber-900">{item.qty}</p>
                                        <p className="text-xs text-amber-700">unidades</p>
                                     </div>
                                 </div>
                             )) : <p className="text-sm text-sb-neutral-500 p-4 text-center">No hay alertas de stock.</p>}
                         </div>
                    </Card>
                 </div>
            </div>
        </div>
    )
}

function AIInsightsCard() {
    const { data } = useData();
    const [insights, setInsights] = useState("");
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!data) return;
        setLoading(true);
        setInsights("");
        try {
            const relevantData = {
                inventory: data.inventory?.slice(0, 30).map(i => ({ sku: i.sku, lot: i.lotNumber, qty: i.qty, loc: i.locationId, exp: i.expDate })),
                shipments: data.shipments?.slice(0, 20).map(s => ({ id: s.id, status: s.status, city: s.city, lines: s.lines.length })),
            };
            const result = await generateInsights({ 
                jsonData: JSON.stringify(relevantData),
                context: "Eres un experto en logística y gestión de almacenes. Analiza los datos de inventario y envíos para identificar riesgos de caducidad, niveles de stock anómalos, o patrones en los envíos (p.ej., retrasos, destinos comunes)."
            });
            setInsights(result);
        } catch (e: any) {
            console.error(e);
            setInsights("Hubo un error al generar el informe. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SBCard title="Análisis de Almacén con IA">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-600">Encuentra tendencias en el inventario y los envíos pendientes.</p>
                    <SBButton onClick={handleGenerate} disabled={loading}>
                        <BrainCircuit className="h-4 w-4" /> {loading ? 'Analizando...' : 'Generar Informe'}
                    </SBButton>
                </div>
                {insights && (
                    <div className="prose prose-sm p-4 bg-zinc-50 rounded-lg border max-w-none whitespace-pre-wrap">
                        {insights}
                    </div>
                )}
            </div>
        </SBCard>
    );
}

function UpcomingEvents() {
    const { data } = useData();
    const { overdue, upcoming } = useMemo(() => {
        if (!data?.interactions) return { overdue: [], upcoming: [] };
        
        const now = new Date();
        const openInteractions = data.interactions
            .filter(i => i.dept === 'ALMACEN' && i.status === 'open' && i.plannedFor);
            
        const overdue = openInteractions
            .filter(i => new Date(i.plannedFor!) < now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());
            
        const upcoming = openInteractions
            .filter(i => new Date(i.plannedFor!) >= now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());

        return { overdue, upcoming };
    }, [data]);

    const allEvents = [...overdue, ...upcoming].slice(0, 5);

    if (allEvents.length === 0) {
        return (
            <Card title="Próximas Tareas de Almacén">
                <p className="p-4 text-sm text-center text-zinc-500">No hay tareas programadas.</p>
            </Card>
        );
    }

    return (
        <Card title="Próximas Tareas de Almacén">
            <div className="p-4 space-y-3">
                {allEvents.map((event: Interaction) => {
                    const isOverdue = new Date(event.plannedFor!) < new Date();
                    const Icon = isOverdue ? AlertCircle : Clock;
                    
                    return (
                         <div key={event.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${isOverdue ? 'bg-rose-50/50 border-rose-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                            <div className="p-2 rounded-full" style={{ backgroundColor: DEPT_META.ALMACEN.color, color: DEPT_META.ALMACEN.textColor }}>
                                <Icon size={16} />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{event.note}</p>
                                <p className={`text-xs ${isOverdue ? 'text-rose-600 font-semibold' : 'text-zinc-500'}`}>{new Date(event.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

export default function Dashboard() {
    const { data: santaData } = useData();

    const { inventory, shipments } = useMemo(() => {
        return {
            inventory: santaData?.inventory || [],
            shipments: santaData?.shipments || [],
        };
    }, [santaData]);

    if (!santaData) {
        return <div className="p-6 text-center">Cargando datos de almacén...</div>;
    }
    
    return (
        <div className="space-y-6">
            <WarehouseDashboardContent inventory={inventory} shipments={shipments} />
            <div className="pt-6">
                <AIInsightsCard />
            </div>
        </div>
    );
}
