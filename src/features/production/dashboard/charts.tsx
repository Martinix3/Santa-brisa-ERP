"use client";
import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LineChart, Line } from "recharts";

export function AreaBasic({ data, xKey, yKey, height=220, unit }:{ data:any[]; xKey:string; yKey:string; height?:number; unit?:string }){
  return (
    <div style={{height: `${height}px`, width: '100%'}}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v:any)=> unit?`${v} ${unit}`:v} />
          <Area type="monotone" dataKey={yKey} stroke="#3b82f6" fill="url(#c1)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarBasic({ data, xKey, yKey, height=220, unit }:{ data:any[]; xKey:string; yKey:string; height?:number; unit?:string }){
  return (
    <div style={{height: `${height}px`, width: '100%'}}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v:any)=> unit?`${v} ${unit}`:v} />
          <Bar dataKey={yKey} fill="#06b6d4" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineBasic({ data, xKey, yKey, height=220, unit }:{ data:any[]; xKey:string; yKey:string; height?:number; unit?:string }){
  return (
    <div style={{height: `${height}px`, width: '100%'}}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v:any)=> unit?`${v} ${unit}`:v} />
          <Line type="monotone" dataKey={yKey} stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
