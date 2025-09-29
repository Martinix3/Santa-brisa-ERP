
// src/app/(app)/dashboard-ventas/page.tsx
"use client";
import React, { useMemo, useState } from "react";
import dynamic from 'next/dynamic';
import {
  Users, MessageCircle, Euro, Package, Briefcase, CheckSquare, TrendingUp, TrendingDown,
} from "lucide-react";
import { useData } from "@/lib/dataprovider";
import type { Interaction, OrderSellOut } from "@/domain/ssot";
import { orderTotal } from "@/lib/sb-core";

// --- UI Components based on the new design ---
const KpiCard = ({ icon: Icon, title, value, change, progress, goal, color }: {
  icon: React.ElementType;
  title: string;
  value: string;
  change: string;
  progress: number;
  goal: string;
  color: string;
}) => {
  const isUp = change.startsWith('+');
  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-white p-2 rounded-lg border border-gray-200">
          <Icon className="text-gray-600" size={20} />
        </div>
        <p className="text-sm text-gray-600 font-medium">{title}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <div className="flex items-center text-sm mt-1">
        {isUp ? (
          <TrendingUp className="text-green-500 mr-1" size={16} />
        ) : (
          <TrendingDown className="text-red-500 mr-1" size={16} />
        )}
        <span className={`${isUp ? 'text-green-600' : 'text-red-600'} font-semibold mr-1`}>{change}</span>
        <span className="text-gray-500">vs mes anterior</span>
      </div>
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

const TaskItem = ({ title, status, initials, color }: { title: string; status: string; initials: string; color: string }) => {
  const statusColors = {
    'Vencido': { bg: '#33333320', text: '#333333', border: '#33333335' },
    'Próxima': { bg: '#2D7FF920', text: '#2D7FF9', border: '#2D7FF935' },
  };
  const s = statusColors[status as keyof typeof statusColors] || statusColors['Próxima'];

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center">
            <div>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <div className="flex items-center space-x-2 mt-1">
                      <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '6px', fontSize: '11px', backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontWeight: 600 }}>{status}</span>
                </div>
            </div>
        </div>
        <span style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: color, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initials}</span>
    </div>
  );
};


// Lazy load charts
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const DoughnutChart = dynamic(() => import("recharts").then(m => m.Doughnut), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });


// --- Mock Data as per design ---
const salesEvolutionData = [
  { name: 'Abr', Ventas: 1200, POS: 5 },
  { name: 'May', Ventas: 1900, POS: 8 },
  { name: 'Jun', Ventas: 3000, POS: 10 },
  { name: 'Jul', Ventas: 5000, POS: 15 },
  { name: 'Ago', Ventas: 2300, POS: 9 },
  { name: 'Sep', Ventas: 3200, POS: 12 },
];

const salesMixData = [
  { name: 'HORECA', value: 45 },
  { name: 'Distribuidor', value: 25 },
  { name: 'Retail', value: 20 },
  { name: 'Online', value: 10 },
];
const salesMixColors = ['#F4C542', '#77D9CF', '#B25A32', '#F26D3D'];

const brandColor = "#f5ce3e";


export default function SalesDashboardPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

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
            <KpiCard icon={Users} title="Nuevas Cuentas" value="1" change="+25%" progress={10} goal="1 / 10" color={brandColor} />
            <KpiCard icon={MessageCircle} title="Conversión a pedido" value="0.0%" change="-5.2%" progress={0} goal="0%" color={brandColor} />
            <KpiCard icon={Euro} title="Facturación" value="0 €" change="-100%" progress={0} goal="0€" color={brandColor} />
            <KpiCard icon={Package} title="Cajas vendidas" value="42" change="+15.8%" progress={42} goal="42 / 100" color={brandColor} />
            <KpiCard icon={Briefcase} title="Visitas" value="124" change="+5%" progress={62} goal="124 / 200" color={brandColor} />
            <KpiCard icon={CheckSquare} title="POS tactics colocadas" value="3" change="-10%" progress={0} goal="3" color={brandColor} />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900">Evolución de ventas + POS</h3>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
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
                      <Tooltip formatter={(value) => `${value}%`}/>
                      <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: "11px"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">Próximas Tareas</h3>
                <div className="mt-4 space-y-3">
                  <TaskItem title="Revisar propuesta cliente B" status="Vencido" initials="M" color="#B25A32" />
                  <TaskItem title="Llamada de seguimiento" status="Próxima" initials="A" color="#77D9CF" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
