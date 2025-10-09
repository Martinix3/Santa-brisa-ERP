// src/features/accounts/components/AccountCard.tsx
"use client";

import React, { useState } from 'react';
import { Account, SantaData, OrderSellOut } from '@/domain/ssot';
import { orderTotal } from '@/lib/sb-core';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui';
import { Calendar, Package, Euro, Target, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { QuickLogDialog } from '@/features/quicklog/QuickLogDialog';
import { toast } from 'sonner';

type AccountCardProps = {
  account: Account;
  data: SantaData;
  onToggleTarget?: (accountId: string) => void;
};

export function AccountCard({ account, data, onToggleTarget }: AccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  // Owner info
  const owner = data.teamMembers?.find(u => u.id === account.salesRepId);
  const ownerName = owner?.name || 'Sin asignar';

  // Última interacción
  const interactions = data.interactions?.filter(i => i.accountId === account.id) || [];
  const lastInteraction = interactions.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // Última venta
  const orders = data.ordersSellOut?.filter((o: OrderSellOut) => o.accountId === account.id) || [];
  const lastOrder = orders.sort((a: OrderSellOut, b: OrderSellOut) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // Total facturado YTD
  const ytdOrders = orders.filter((o: OrderSellOut) => {
    const year = new Date(o.createdAt).getFullYear();
    return year === new Date().getFullYear();
  });
  const totalYTD = ytdOrders.reduce((sum: number, o: OrderSellOut) => sum + orderTotal(o), 0);

  // Colores por tipo de cuenta
  const accountTypeColors: Record<string, string> = {
    'HORECA': 'bg-blue-100 text-blue-800',
    'RETAIL': 'bg-purple-100 text-purple-800',
    'ONLINE': 'bg-orange-100 text-orange-800',
    'DISTRIBUIDOR': 'bg-green-100 text-green-800',
    'CLIENTE_FINAL': 'bg-gray-100 text-gray-800',
    'IMPORTADOR': 'bg-teal-100 text-teal-800',
    'OTRO': 'bg-slate-100 text-slate-800',
  };

  const accountTypeColor = accountTypeColors[account.accountType] || 'bg-gray-100 text-gray-800';
  const isTarget = account.isTarget || false;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleToggleTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleTarget) {
      onToggleTarget(account.id);
      toast.success(isTarget ? 'Objetivo eliminado' : 'Cuenta marcada como objetivo');
    }
  };

  return (
    <>
      <div 
        className={`bg-white border rounded-lg p-2 hover:shadow-md transition-all cursor-pointer relative ${
          isTarget ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/30' : 'hover:border-[#618E8F]'
        }`}
        onClick={handleToggleExpand}
      >
        {/* Chincheta visual en esquina superior derecha */}
        {isTarget && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-amber-400 rounded-full p-1.5 shadow-lg border-2 border-white">
              <Target className="w-3 h-3 text-amber-900" strokeWidth={3} />
            </div>
          </div>
        )}

        {/* Header: Nombre + Owner + Actions */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h4 className={`font-semibold text-sm truncate leading-tight ${
                isTarget ? 'text-amber-900' : 'text-gray-900'
              }`}>
                {account.name}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {ownerName}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge className={`text-xs ${accountTypeColor}`}>
              {account.accountType}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </div>
        </div>

        {/* Stats compactos */}
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {/* Última interacción */}
          {lastInteraction && (
            <div className="flex items-center gap-1">
              <Calendar size={10} className="flex-shrink-0" />
              <span className="truncate">
                {new Date(lastInteraction.createdAt).toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'short' 
                })}
                {' · '}
                {lastInteraction.kind}
              </span>
            </div>
          )}

          {/* Última venta + Total YTD en misma línea */}
          {(lastOrder || totalYTD > 0) && (
            <div className="flex items-center justify-between gap-2">
              {lastOrder && (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Package size={10} className="flex-shrink-0" />
                  <span className="truncate">
                    {new Date(lastOrder.createdAt).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </span>
                </div>
              )}
              {totalYTD > 0 && (
                <div className="flex items-center gap-0.5 font-semibold text-gray-900 flex-shrink-0">
                  <Euro size={10} />
                  <span className="text-xs">{Math.round(totalYTD)}€</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sin actividad warning */}
        {!lastInteraction && !lastOrder && !isExpanded && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ Sin actividad
          </div>
        )}

        {/* Expanded actions */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t space-y-1">
            <button
              onClick={handleToggleTarget}
              className={`w-full text-xs px-2 py-1.5 rounded flex items-center justify-center gap-1.5 font-medium transition-colors ${
                isTarget
                  ? 'bg-amber-400 text-amber-900 hover:bg-amber-500 shadow-sm'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              <Target className="w-4 h-4" strokeWidth={2.5} />
              {isTarget ? '🎯 Quitar objetivo' : '📌 Marcar como objetivo'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickLog(true);
              }}
              className="w-full text-xs px-2 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
            >
              Registrar actividad
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetail(true);
              }}
              className="w-full text-xs px-2 py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Ver detalle completo
            </button>
          </div>
        )}
      </div>

      {/* QuickLog Dialog */}
      {showQuickLog && (
        <QuickLogDialog
          open={showQuickLog}
          onOpenChange={setShowQuickLog}
          accountId={account.id}
          defaultTab="INTERACCION"
          onSaved={() => {
            toast.success("Actividad registrada");
            setShowQuickLog(false);
          }}
        />
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{account.name}</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <Link 
                href={`/accounts/${account.id}`}
                className="text-sm text-primary hover:underline mb-4 inline-block"
              >
                → Abrir página completa
              </Link>
              {/* Aquí iría el contenido del detalle */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Cuenta</p>
                  <p className="font-medium">{account.accountType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-medium">{account.accountStage}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">{owner?.name || 'Sin asignar'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
