

"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { generateInsights } from '@/ai/flows/generate-insights-flow';
import { SBCard, SBButton, DataTableSB } from '@/components/ui/ui-primitives';
import type { Col } from '@/components/ui/ui-primitives';
import { BrainCircuit, Package, DollarSign, Truck, AlertCircle, Clock } from 'lucide-react';
import type { InventoryItem, Shipment, Interaction, StockMove, Account, ShipmentStatus, SB_THEME } from '@/domain/ssot';
import { DEPT_META, SB_COLORS } from '@/domain/ssot';
import Link from 'next/link';
import { samplesSentSummary } from "@/lib/consignment-and-samples";
import { UpcomingTasks } from '@/features/agenda/components/UpcomingTasks';

function KPI({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string | number, color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-sb-neutral-200 flex items-start gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color }}>
                <Icon size={20} className="sb-icon" />
            </div>
            <div>
                <p className="text-2xl font-bold text-sb-neutral-900">{value}</p>
                <p className="text-sm text-sb-neutral-600">{label}</p>
            </div>
        </div>
    )
}

function StatusPill({status}:{status: Shipment['status']}){
  const map: Record<ShipmentStatus, { txt:string, bg:string }> = {
    pending: { txt: "Pendiente", bg: "bg-yellow-100 text-yellow-800" },
    picking: { txt: "En picking", bg: "bg-blue-100 text-blue-800" },
    ready_to_ship: { txt: "Listo", bg: "bg-purple-100 text-purple-800" },
    shipped: { txt: "Enviado", bg: "bg-cyan-100 text-cyan-800" },
    delivered: { txt: "Entregado", bg: "bg-green-100 text-green-800" },
    cancelled: { txt: "Cancelado", bg: "bg-red-100 text-red-800" },
    exception: { txt: "Incidencia", bg: "bg-orange-100 text-orange-800" },
  };
  const s = map[status] || map.pending;
  return <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${s.bg}`}>{s.txt}</span>;
}

function SamplesSentCard({ shipments, stockMoves, accounts }: { shipments: Shipment[], stockMoves: StockMove[], accounts: Account[] }) {
    const sinceISO = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const sampleRows = useMemo(
        () => samplesSentSummary({ shipments, stockMoves, accounts, sinceISO }),
        [shipments, stockMoves, accounts, sinceISO]
    );

    return (
        <SBCard title="Muestras enviadas · 30 días">
            <div className="p-3 overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="text-left text-zinc-600">
                            <th className="p-2">Cuenta</th>
                            <th className="p-2">Unidades</th>
                            <th className="p-2">Envíos</th>
                            <th className="p-2">Último envío</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sampleRows.map(r => (
                            <tr key={r.accountId} className="border-t">
                                <td className="p-2">
                                    <Link href={`/accounts/${r.accountId}`} className="hover:underline font-medium">
                                        {r.name}
                                    </Link>
                                </td>
                                <td className="p-2">{r.units}</td>
                                <td className="p-2">{r.shipments}</td>
                                <td className="p-2">{r.last ? new Date(r.last).toLocaleDateString('es-ES') : '—'}</td>
                            </tr>
                        ))}
                        {sampleRows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-zinc-500">No se han enviado muestras recientemente.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </SBCard>
    );
}


function WarehouseDashboardContent({ inventory, shipments, stockMoves, accounts }: { inventory: InventoryItem[], shipments: Shipment[], stockMoves: StockMove[], accounts: Account[] }) {
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
                    <SBButton variant="subtle">Ver</SBButton>
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
                    <SBCard title="Envíos Recientes">
                         <DataTableSB rows={shipments.slice(0,10)} cols={shipmentCols as any} />
                    </SBCard>
                </div>
                 <div className="space-y-6">
                     <UpcomingTasks department="ALMACEN" />
                     <SBCard title="Alertas de Stock Bajo">
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
                    </SBCard>
                 </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2">
                    <SamplesSentCard shipments={shipments} stockMoves={stockMoves} accounts={accounts} />
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

export default function Dashboard() {
    const { data: santaData } = useData();

    const { inventory, shipments, stockMoves, accounts } = useMemo(() => {
        return {
            inventory: santaData?.inventory || [],
            shipments: santaData?.shipments || [],
            stockMoves: santaData?.stockMoves || [],
            accounts: santaData?.accounts || [],
        };
    }, [santaData]);

    if (!santaData) {
        return <div className="p-6 text-center">Cargando datos de almacén...</div>;
    }
    
    return (
        <div className="space-y-6">
            <WarehouseDashboardContent inventory={inventory} shipments={shipments} stockMoves={stockMoves} accounts={accounts} />
            <div className="pt-6">
                <AIInsightsCard />
            </div>
        </div>
    );
}
