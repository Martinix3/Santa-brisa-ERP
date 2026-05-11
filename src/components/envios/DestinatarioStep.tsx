/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/envios/DestinatarioStep.tsx
"use client";

import React, { useState } from 'react';
import { Search, User, Plus, MapPin, Building2 } from 'lucide-react';
import { Input, SBButton } from '@/components/ui/ui-primitives';
import type { Account } from '@/domain/ssot';

interface DestinatarioStepProps {
  accounts: Account[];
  selectedContact: Account | null;
  onSelectContact: (account: Account | null) => void;
}

export function DestinatarioStep({
  accounts,
  selectedContact,
  onSelectContact,
}: DestinatarioStepProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Contactos frecuentes (últimos 10)
  const frequentContacts = accounts.slice(0, 10);

  // Filtrar por búsqueda
  const filteredContacts = searchQuery
    ? accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ((a as any).city && (a as any).city.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : frequentContacts;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          size={18}
        />
        <Input
          type="text"
          placeholder="Buscar por nombre, ciudad..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Selected Contact Preview */}
      {selectedContact && (
        <div className="sb-card-glass-light p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">
                  {selectedContact.name}
                </h4>
                {(selectedContact as any).city && (
                  <p className="text-xs text-zinc-600 flex items-center gap-1">
                    <MapPin size={12} />
                    {(selectedContact as any).city}
                  </p>
                )}
                {selectedContact.accountType && (
                  <p className="text-xs text-zinc-600 flex items-center gap-1 mt-1">
                    <Building2 size={12} />
                    {selectedContact.accountType}
                  </p>
                )}
              </div>
            </div>
            <SBButton
              variant="ghost"
              size="sm"
              onClick={() => onSelectContact(null)}
            >
              Cambiar
            </SBButton>
          </div>
        </div>
      )}

      {/* Contacts Grid */}
      {!selectedContact && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">
              {searchQuery ? 'Resultados de búsqueda' : 'Contactos frecuentes'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredContacts.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-zinc-500 text-sm">
                  No se encontraron contactos
                </div>
              ) : (
                filteredContacts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => onSelectContact(account)}
                    className="sb-card hover-raise p-4 text-left transition-all hover:border-primary"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 flex-shrink-0">
                        <User className="h-5 w-5 text-zinc-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 truncate">
                          {account.name}
                        </h4>
                        {(account as any).city && (
                          <p className="text-xs text-zinc-600 flex items-center gap-1">
                            <MapPin size={10} />
                            <span className="truncate">{(account as any).city}</span>
                          </p>
                        )}
                        {account.accountType && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700">
                            {account.accountType}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* New Contact Button */}
          <div className="pt-4 border-t">
            <SBButton variant="outline" className="w-full">
              <Plus size={16} />
              Nuevo Destinatario
            </SBButton>
          </div>
        </>
      )}
    </div>
  );
}
