// src/features/admin/components/UserRankingTable.tsx
"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { getCajasSellOut } from '@/lib/sales-helpers';

export function UserRankingTable() {
  const { data } = useData();

  const userStats = useMemo(() => {
    if (!data) return [];
    return (data.users || [])
      .filter(u => u.role !== 'admin')
      .map(user => {
        const userAccounts = (data.accounts || []).filter(a => a.ownerId === user.id);
        const userOrders = (data.ordersSellOut || []).filter(o => userAccounts.some(a => a.id === o.accountId));
        const userCajas = getCajasSellOut(userOrders);
        const userTasks = (data.interactions || []).filter(i => i.userId === user.id);
        return { 
          user, 
          accountsCount: userAccounts.length, 
          ordersCount: userOrders.length, 
          cajas: userCajas, 
          tasksCount: userTasks.length, 
          completedTasksCount: userTasks.filter(t => t.status === 'done').length 
        };
      })
      .sort((a, b) => b.cajas - a.cajas);
  }, [data]);

  if (userStats.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No hay usuarios para mostrar en el ranking.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Pos.</th>
            <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Usuario</th>
            <th className="py-3 px-4 text-center font-semibold text-muted-foreground">Cuentas</th>
            <th className="py-3 px-4 text-center font-semibold text-muted-foreground">Pedidos</th>
            <th className="py-3 px-4 text-center font-semibold text-muted-foreground">Cajas</th>
            <th className="py-3 px-4 text-center font-semibold text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody>
          {userStats.map((stat, idx) => (
            <tr key={stat.user.id} className="border-b border-border last:border-b-0 hover:bg-secondary">
              <td className="py-4 px-4">
                <span className="font-bold text-lg w-8 text-center block">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </span>
              </td>
              <td className="py-4 px-4">
                <p className="font-semibold text-foreground">{stat.user.name || stat.user.email}</p>
                <p className="text-xs text-muted-foreground">{stat.user.email}</p>
              </td>
              <td className="py-4 px-4 text-center font-medium text-foreground">{stat.accountsCount}</td>
              <td className="py-4 px-4 text-center font-medium text-foreground">{stat.ordersCount}</td>
              <td className="py-4 px-4 text-center text-lg font-bold text-success">{stat.cajas}</td>
              <td className="py-4 px-4 text-center">
                <div className="sb-badge inline-block" data-variant={stat.user.active ? 'success' : 'secondary'}>
                  {stat.user.active ? 'Activo' : 'Inactivo'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
