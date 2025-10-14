'use client';

import React from 'react';
import { Car, Package, PartyPopper, MapPin } from 'lucide-react';

type QuickAction = 'VISIT' | 'ORDER' | 'EVENT' | 'POS';

type Props = {
  onAction: (action: QuickAction) => void;
};

export function QuickActionsBar({ onAction }: Props) {
  const actions = [
    {
      id: 'VISIT' as QuickAction,
      label: 'Visita',
      icon: Car,
      color: 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20',
    },
    {
      id: 'ORDER' as QuickAction,
      label: 'Pedido',
      icon: Package,
      color: 'bg-success/10 hover:bg-success/20 text-success border-success/20',
    },
    {
      id: 'EVENT' as QuickAction,
      label: 'Evento',
      icon: PartyPopper,
      color: 'bg-accent/10 hover:bg-accent/20 text-accent border-accent/20',
    },
    {
      id: 'POS' as QuickAction,
      label: 'POS',
      icon: MapPin,
      color: 'bg-sb-copper/10 hover:bg-sb-copper/20 text-sb-copper border-sb-copper/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`
              h-20 rounded-2xl border backdrop-blur-sm
              flex flex-col items-center justify-center gap-2
              font-medium text-sm transition-all
              hover:scale-105 hover:shadow-lg
              ${action.color}
            `}
          >
            <Icon size={24} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
