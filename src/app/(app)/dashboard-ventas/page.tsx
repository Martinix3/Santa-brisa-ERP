// src/app/(app)/dashboard-ventas/page.tsx
"use client";
import React, { useMemo, useState } from "react";
import dynamic from 'next/dynamic';
import {
  Users, MessageCircle, Euro, Package, Briefcase, CheckSquare, TrendingUp, TrendingDown,
} from "lucide-react";
import { useData } from "@/lib/dataprovider";
import type { Interaction, OrderSellOut, Account, PosTactic, Item } from "@/domain/ssot";
import { orderTotal, orderToBottles } from "@/lib/sb-core";
import { UpcomingTasks } from "@/features/agenda/components/UpcomingTasks";


// --- UI Components based on the new design ---
const KpiCard = ({ icon: Icon, title, value, change, progress, goal, color }: {
  icon: React.ElementType;
  title: string;
  value: string;
  change?: string;
  progress?: number;
  goal?: string;
  color: string;
}) => {
  const isUp = change?.startsWith('+');
  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-white p-2 rounded-lg border border-gray-200">
          <Icon className="text-gray-600" size={20} />
        </div>
        <p className="text-sm text-gray-600 font-medium">{title}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {change && (
        <div className="flex items-center text-sm mt-1">
          {isUp ? (
            <TrendingUp className="text-green-500 mr-1" size={16} />
          ) : (
            <TrendingDown className="text-red-500 mr-1" size={16} />
          )}
          <span className={`${isUp ? 'text-green-600' : 'text-red-600'} font-semibold mr-1`}>{change}</span>
          <span className="text-gray-500">vs mes anterior</span>
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progreso</span>
                <span>{goal}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: color }}></div>
            </div>
        </div>
      )}
    </div>
  );
};


// Lazy load charts
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });


const brandColor = "#f5ce3e";
const salesMixColors = ['#F4C542', '#77D9CF', '#B25A32', '#F26D3D'];

export default function SalesDashboardPage() {
  const { data } = useData();
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

  const kpis = useMemo(() => {
    if (!data) return { newAccounts: 0, conversionRate: 0, revenue: 0, boxesSold: 0, visits: 0, posTactics: 0 };
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newAccounts = (data.accounts || []).filter(a => new Date(a.createdAt) >= startOfMonth).length;
    const visits = (data.interactions || []).filter(i => i.kind === 'VISITA' && new Date(i.createdAt) >= startOfMonth).length;
    const orders = (data.ordersSellOut || []).filter(o => new Date(o.createdAt) >= startOfMonth);
    const revenue = orders.reduce((sum, o) => sum + orderTotal(o), 0);
    const posTactics = (data.posTactics || []).filter(t => new Date(t.createdAt) >= startOfMonth).length;
    
    const bottlesSold = orders.reduce((sum, o) => sum + orderToBottles(o, data.items as Item[]), 0);
    const boxesSold = Math.round(bottlesSold / 6); // Asumiendo 6 botellas por caja

    const conversionRate = visits > 0 ? (orders.length / visits) * 100 : 0;

    return { newAccounts, conversionRate, revenue, boxesSold, visits, posTactics };
  }, [data, timeRange]);

  const salesEvolutionData = useMemo(() => {
    if (!data) return [];
    const salesByDay: Record<string, { Ventas: number, POS: number }> = {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    (data.ordersSellOut || []).forEach(o => {
        const date = new Date(o.createdAt);
        if(date < startOfMonth) return;
        const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short'});
        if(!salesByDay[day]) salesByDay[day] = { Ventas: 0, POS: 0 };
        salesByDay[day].Ventas += orderTotal(o);
    });

     (data.posTactics || []).forEach(t => {
        const date = new Date(t.createdAt);
        if(date < startOfMonth) return;
        const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short'});
        if(!salesByDay[day]) salesByDay[day] = { Ventas: 0, POS: 0 };
        salesByDay[day].POS += 1;
    });

    return Object.entries(salesByDay).map(([name, values]) => ({ name, ...values }));

  }, [data]);
  
  const salesMixData = useMemo(() => {
      if(!data) return [];
      const salesBySegment: Record<string, number> = { HORECA: 0, RETAIL: 0, ONLINE: 0, DISTRIBUIDOR: 0 };
      (data.ordersSellOut || []).forEach(o => {
          const account = data.accounts.find(a => a.id === o.accountId);
          if (account && account.segment) {
              if (salesBySegment[account.segment] !== undefined) {
                  salesBySegment[account.segment] += orderTotal(o);
              }
          }
      });
      const total = Object.values(salesBySegment).reduce((s, v) => s + v, 0);
      if (total === 0) return [{name: 'Sin datos', value: 100}];
      return Object.entries(salesBySegment).map(([name, value]) => ({ name, value: (value/total) * 100 }));
  }, [data]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package size={24} className="text-gray-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Ventas</h1>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-4">
            <button className="py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">Semana</button>
            <button className="py-2 px-1 text-sm font-medium text-gray-900 border-b-2" style={{borderColor: brandColor}}>Mes</button>
            <button className="py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">Año</button>
          </nav>
        </div>

        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KpiCard icon={Users} title="Nuevas Cuentas" value={kpis.newAccounts.toString()} color={brandColor} goal={`${kpis.newAccounts} / 10`} progress={(kpis.newAccounts/10)*100}/>
            <KpiCard icon={MessageCircle} title="Conversión a pedido" value={`${kpis.conversionRate.toFixed(1)}%`} color={brandColor} />
            <KpiCard icon={Euro} title="Facturación" value={`${kpis.revenue.toLocaleString('es-ES')} €`} color={brandColor} />
            <KpiCard icon={Package} title="Cajas vendidas" value={kpis.boxesSold.toString()} color={brandColor} goal={`${kpis.boxesSold} / 100`} progress={(kpis.boxesSold/100)*100} />
            <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits.toString()} color={brandColor} goal={`${kpis.visits} / 200`} progress={(kpis.visits/200)*100}/>
            <KpiCard icon={CheckSquare} title="POS tactics colocadas" value={kpis.posTactics.toString()} color={brandColor}/>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900">Evolución de ventas + POS</h3>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`}/>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '6px' }} itemStyle={{color: '#fff'}} labelStyle={{color: '#fff', fontWeight: 'bold'}} />
                    <Line type="monotone" dataKey="Ventas" stroke="#F4C542" strokeWidth={2} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{ r: 6 }}/>
                    <Line type="monotone" dataKey="POS" stroke="#9ca3af" strokeWidth={2} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{ r: 6 }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">Mix de Ventas</h3>
                <div className="mt-4 h-36 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={salesMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                        {salesMixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={salesMixColors[index % salesMixColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`}/>
                      <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: "11px"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <UpcomingTasks department="VENTAS" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
