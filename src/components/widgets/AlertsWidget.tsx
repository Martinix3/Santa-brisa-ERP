'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useDrawer } from '@/ui/drawers/drawer-registry';
import { WidgetFrame } from './WidgetFrame';
import { Bell } from 'lucide-react';

export interface AlertItem {
  id: string;
  kind: 'email' | 'visita' | 'pedido';
  text: string;
  accountId?: string;
}

export function AlertsWidget({ 
  title = '🔔 Alertas',
  items = [] 
}: { 
  title?: string;
  items: AlertItem[];
}) {
  const { open } = useDrawer();

  return (
    <WidgetFrame title={title} className="sb-card-glass-subtle">
      {items.length === 0 ? (
        <div className="text-sm opacity-70 p-4">Sin alertas pendientes</div>
      ) : (
        <ul className="divide-y divide-[--sb-border]">
          {items.map(a => (
            <li 
              key={a.id} 
              className="p-3 flex justify-between items-center sb-hover-subtle transition-all"
            >
              <div className="flex-1">
                <span className="sb-badge bg-[--sb-copper]/15 text-[--sb-copper] mr-2">
                  {a.kind}
                </span>
                <span className="text-sm">{a.text}</span>
              </div>
              <div className="flex gap-2 ml-2">
                {a.kind === 'email' && (
                  <button 
                    className="text-xs text-[--sb-copper] hover:underline" 
                    onClick={() => open('email-reply', { threadId: a.id })}
                  >
                    Responder
                  </button>
                )}
                {a.kind === 'visita' && (
                  <button 
                    className="text-xs text-[--sb-copper] hover:underline" 
                    onClick={() => open('visit-reschedule', { interactionId: a.id })}
                  >
                    Reagendar
                  </button>
                )}
                {a.accountId && (
                  <button 
                    className="text-xs text-[--sb-aqua] hover:underline" 
                    onClick={() => open('account-kpis', { accountId: a.accountId })}
                  >
                    KPIs
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
}
