"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useData } from "@/lib/dataprovider";
import type { FinanceLink, Account } from "@/domain/ssot";
import { SBCard } from "@/components/ui/ui-primitives";
import { Receipt, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function CobrosPage() {
  const { data } = useData();
  const financeLinks = data?.financeLinks || [];
  const accounts = data?.accounts || [];
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const cobros = useMemo(() => {
    return financeLinks.filter(f => 
      f.docType === 'invoice' || f.docType === 'receipt' || !f.docType
    );
  }, [financeLinks]);

  const filteredCobros = useMemo(() => {
    let result = cobros;
    
    if (statusFilter !== "all") {
      result = result.filter(c => c.status === statusFilter);
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.docNumber?.toLowerCase().includes(search) ||
        c.externalId?.toLowerCase().includes(search)
      );
    }
    
    return result.sort((a, b) => 
      new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );
  }, [cobros, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const pending = cobros.filter(c => c.status === 'pending');
    const paid = cobros.filter(c => c.status === 'paid');
    const overdue = cobros.filter(c => c.status === 'overdue');
    
    return {
      total: cobros.reduce((sum, c) => sum + c.grossAmount, 0),
      pending: pending.reduce((sum, c) => sum + c.grossAmount, 0),
      paid: paid.reduce((sum, c) => sum + c.grossAmount, 0),
      overdue: overdue.reduce((sum, c) => sum + c.grossAmount, 0),
    };
  }, [cobros]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getAccountName = (partyId?: string) => {
    if (!partyId) return 'N/A';
    const account = accounts.find(a => a.id === partyId);
    return account?.name || partyId;
  };

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Receipt className="h-6 w-6" />
        Gestión de Cobros
      </h1>
      
      <div className="sb-page__content">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Total Cobros</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
            </div>
          </SBCard>
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Pendiente</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pending)}</p>
            </div>
          </SBCard>
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Cobrado</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p>
            </div>
          </SBCard>
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Vencido</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
            </div>
          </SBCard>
        </div>

        {/* Filters and List */}
        <SBCard>
          <div className="sb-card__header">
            <div className="sb-card__title">Listado de Cobros</div>
          </div>
          
          {/* Toolbar */}
          <div className="sb-toolbar">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Buscar por número de documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-md border border-border bg-background"
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-border bg-background"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>

          <div className="sb-card__content">
            {filteredCobros.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchTerm || statusFilter !== "all" 
                  ? "No se encontraron cobros con los filtros aplicados" 
                  : "No hay cobros registrados"}
              </p>
            ) : (
              <div className="sb-table-wrapper">
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Cliente</th>
                      <th>Fecha Emisión</th>
                      <th>Vencimiento</th>
                      <th className="text-right">Neto</th>
                      <th className="text-right">IVA</th>
                      <th className="text-right">Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCobros.map((cobro) => (
                      <tr key={cobro.id}>
                        <td className="font-medium">{cobro.docNumber || cobro.externalId}</td>
                        <td>{getAccountName(cobro.partyId)}</td>
                        <td>{new Date(cobro.issueDate).toLocaleDateString('es-ES')}</td>
                        <td>{new Date(cobro.dueDate).toLocaleDateString('es-ES')}</td>
                        <td className="text-right font-mono">{formatCurrency(cobro.netAmount)}</td>
                        <td className="text-right font-mono">{formatCurrency(cobro.taxAmount)}</td>
                        <td className="text-right font-mono font-bold">{formatCurrency(cobro.grossAmount)}</td>
                        <td>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            cobro.status === 'paid' ? 'bg-green-100 text-green-800' :
                            cobro.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {cobro.status === 'paid' ? 'Pagado' : 
                             cobro.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SBCard>
      </div>
    </div>
  );
}
