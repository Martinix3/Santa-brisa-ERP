"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React from 'react';
import { useData } from '@/lib/dataprovider';
import { AccountDrawer } from '@/components/accounts/AccountDrawer';
import type { Account } from '@/domain/ssot';

export function AccountQuickView({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const { data } = useData();
  const account = (data?.accounts || []).find((a: any) => a.id === accountId) as Account | undefined;

  if (!account) {
    return (
      <aside className="sb-drawer">
        <header className="sb-drawer__header">
          <h3>Cargando cuenta…</h3>
          <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
        </header>
        <div className="sb-drawer__body">
          <p className="text-sm opacity-70">Buscando información de la cuenta…</p>
        </div>
      </aside>
    );
  }

  return <AccountDrawer account={account} onClose={onClose} />;
}

