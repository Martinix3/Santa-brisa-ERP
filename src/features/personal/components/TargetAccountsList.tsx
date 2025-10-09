"use client";
import React from 'react';
import { Account } from '@/domain/ssot.v7';
import { Target, MapPin, Phone, Mail, Calendar } from 'lucide-react';
import Link from 'next/link';

type TargetAccountsListProps = {
  accounts: Account[];
};

export function TargetAccountsList({ accounts }: TargetAccountsListProps) {
  // Filtrar solo cuentas marcadas como objetivo
  const targetAccounts = accounts.filter(a => (a as any).isTarget === true);

  if (targetAccounts.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground font-medium">Sin objetivos marcados</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ve a la vista de cuentas para marcar tus objetivos comerciales
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {targetAccounts.map(account => {
        const stageColors: Record<string, string> = {
          'POTENCIAL': 'bg-blue-100 text-blue-800 border-blue-300',
          'SEGUIMIENTO': 'bg-amber-100 text-amber-800 border-amber-300',
          'ACTIVA': 'bg-green-100 text-green-800 border-green-300',
          'FALLIDA': 'bg-red-100 text-red-800 border-red-300',
          'CERRADA': 'bg-slate-100 text-slate-800 border-slate-300',
          'BAJA': 'bg-zinc-100 text-zinc-800 border-zinc-300',
        };

        const stageLabels: Record<string, string> = {
          'POTENCIAL': 'Potencial',
          'SEGUIMIENTO': 'Seguimiento',
          'ACTIVA': 'Activa',
          'FALLIDA': 'Perdida',
          'CERRADA': 'Cerrada',
          'BAJA': 'Baja',
        };

        const stageClass = stageColors[account.stage || ''] || 'bg-gray-100 text-gray-800 border-gray-300';
        const stageLabel = stageLabels[account.stage || ''] || account.stage;

        return (
          <Link
            key={account.id}
            href={`/accounts/${account.id}`}
            className="block sb-card hover-raise pressable"
          >
            <div className="sb-card__content">
              <div className="flex items-start justify-between gap-3">
                {/* Icono Target */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                </div>

                {/* Información */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {account.name}
                    </h3>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${stageClass}`}>
                      {stageLabel}
                    </span>
                  </div>

                  {/* Detalles */}
                  <div className="space-y-1.5">
                    {(account as any).city && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{(account as any).city}</span>
                      </div>
                    )}
                    
                    {(account as any).phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{(account as any).phone}</span>
                      </div>
                    )}

                    {(account as any).email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{(account as any).email}</span>
                      </div>
                    )}

                    {(account as any).targetedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>
                          Objetivo desde {new Date((account as any).targetedAt).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
