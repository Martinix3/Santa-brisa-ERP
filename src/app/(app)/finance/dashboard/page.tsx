"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useData } from "@/lib/dataprovider";
import type { FinanceLink, PaymentLink } from "@/domain/ssot";
import { SBCard } from "@/components/ui/ui-primitives";
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle } from "lucide-react";
import { useMemo } from "react";

export default function FinanceDashboardPage() {
  const { data } = useData();
  const financeLinks = data?.financeLinks || [];
  const paymentLinks = data?.paymentLinks || [];

  const stats = useMemo(() => {
    const pending = financeLinks.filter(f => f.status === 'pending');
    const paid = financeLinks.filter(f => f.status === 'paid');
    const overdue = financeLinks.filter(f => f.status === 'overdue');

    const totalPending = pending.reduce((sum, f) => sum + f.grossAmount, 0);
    const totalPaid = paid.reduce((sum, f) => sum + f.grossAmount, 0);
    const totalOverdue = overdue.reduce((sum, f) => sum + f.grossAmount, 0);

    return {
      pending: { count: pending.length, amount: totalPending },
      paid: { count: paid.length, amount: totalPaid },
      overdue: { count: overdue.length, amount: totalOverdue },
      totalPayments: paymentLinks.length,
    };
  }, [financeLinks, paymentLinks]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <DollarSign className="h-6 w-6" />
        Dashboard Finanzas
      </h1>
      
      <div className="sb-page__content">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SBCard>
            <div className="sb-card__content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendiente</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.pending.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.pending.count} documentos</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </div>
          </SBCard>

          <SBCard>
            <div className="sb-card__content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pagado</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(stats.paid.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.paid.count} documentos</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
          </SBCard>

          <SBCard>
            <div className="sb-card__content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vencido</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.overdue.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.overdue.count} documentos</p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
            </div>
          </SBCard>

          <SBCard>
            <div className="sb-card__content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pagos Realizados</p>
                  <p className="text-2xl font-bold">{stats.totalPayments}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total de transacciones</p>
                </div>
                <TrendingUp className="h-8 w-8 text-info" />
              </div>
            </div>
          </SBCard>
        </div>

        {/* Recent Transactions */}
        <SBCard>
          <div className="sb-card__header">
            <div className="sb-card__title">Documentos Recientes</div>
          </div>
          <div className="sb-card__content">
            {financeLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay documentos financieros registrados
              </p>
            ) : (
              <div className="sb-table-wrapper">
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Número</th>
                      <th>Fecha Emisión</th>
                      <th>Vencimiento</th>
                      <th className="text-right">Importe</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeLinks.slice(0, 10).map((doc) => (
                      <tr key={doc.id}>
                        <td className="font-medium">{doc.docType}</td>
                        <td>{doc.docNumber || doc.externalId}</td>
                        <td>{new Date(doc.issueDate).toLocaleDateString('es-ES')}</td>
                        <td>{new Date(doc.dueDate).toLocaleDateString('es-ES')}</td>
                        <td className="text-right font-mono">{formatCurrency(doc.grossAmount)}</td>
                        <td>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            doc.status === 'paid' ? 'bg-success/10 text-success' :
                            doc.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                            'bg-warning/10 text-warning'
                          }`}>
                            {doc.status === 'paid' ? 'Pagado' : doc.status === 'overdue' ? 'Vencido' : 'Pendiente'}
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
