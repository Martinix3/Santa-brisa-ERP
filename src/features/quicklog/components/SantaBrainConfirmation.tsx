/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/quicklog/components/SantaBrainConfirmation.tsx
"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { Account } from "@/domain/ssot";

interface Props {
  open: boolean;
  onConfirm: (accountId: string) => void;
  onCancel: () => void;
}

export function SantaBrainConfirmation({ open, onConfirm, onCancel }: Props) {
  const { data } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const accounts = useMemo(() => data?.accounts || [], [data?.accounts]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setFilteredAccounts([]);
      return;
    }

    // Initial load
    setFilteredAccounts(accounts.slice(0, 10));
  }, [open, accounts]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAccounts(accounts.slice(0, 10));
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const filtered = accounts.filter((acc: Account) =>
        acc.name.toLowerCase().includes(query) ||
        acc.id.toLowerCase().includes(query)
      ).slice(0, 20);

      setFilteredAccounts(filtered);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, accounts]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="sb-card-glass-light w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40">
          <div>
            <h2 className="text-xl font-bold">Confirmar Cuenta</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Selecciona la cuenta correcta para este registro
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o ID..."
              className="sb-input pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Accounts List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No se encontraron cuentas" : "No hay cuentas disponibles"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => onConfirm(account.id)}
                  className="w-full p-4 rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/50 transition-all text-left"
                >
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {account.segment} • {account.stage}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/40 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="sb-btn sb-btn--ghost"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
