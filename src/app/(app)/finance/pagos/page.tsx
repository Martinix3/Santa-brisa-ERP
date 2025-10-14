"use client";
import { useData } from "@/lib/dataprovider";
import type { PaymentLink, FinanceLink } from "@/domain/ssot";
import { SBCard } from "@/components/ui/ui-primitives";
import { CreditCard, Search, Calendar } from "lucide-react";
import { useMemo, useState } from "react";

export default function PagosPage() {
  const { data } = useData();
  const paymentLinks = data?.paymentLinks || [];
  const financeLinks = data?.financeLinks || [];
  
  const [searchTerm, setSearchTerm] = useState("");

  const paymentsWithDetails = useMemo(() => {
    return paymentLinks.map(payment => {
      const financeDoc = financeLinks.find(f => f.id === payment.financeLinkId);
      return {
        ...payment,
        financeDoc
      };
    }).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [paymentLinks, financeLinks]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return paymentsWithDetails;
    
    const search = searchTerm.toLowerCase();
    return paymentsWithDetails.filter(p => 
      p.externalId?.toLowerCase().includes(search) ||
      p.financeDoc?.docNumber?.toLowerCase().includes(search) ||
      p.method?.toLowerCase().includes(search)
    );
  }, [paymentsWithDetails, searchTerm]);

  const stats = useMemo(() => {
    const totalAmount = paymentLinks.reduce((sum, p) => sum + p.amount, 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthPayments = paymentLinks.filter(p => {
      const date = new Date(p.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    
    return {
      total: totalAmount,
      count: paymentLinks.length,
      thisMonth: thisMonthAmount,
      thisMonthCount: thisMonthPayments.length,
    };
  }, [paymentLinks]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <CreditCard className="h-6 w-6" />
        Registro de Pagos
      </h1>
      
      <div className="sb-page__content">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Total Pagado</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
            </div>
          </SBCard>
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Nº Pagos</p>
              <p className="text-2xl font-bold">{stats.count}</p>
            </div>
          </SBCard>
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Este Mes</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.thisMonth)}</p>
            </div>
          </SBCard>
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Pagos del Mes</p>
              <p className="text-2xl font-bold text-blue-600">{stats.thisMonthCount}</p>
            </div>
          </SBCard>
        </div>

        {/* Payments List */}
        <SBCard>
          <div className="sb-card__header">
            <div className="sb-card__title">Historial de Pagos</div>
          </div>
          
          {/* Toolbar */}
          <div className="sb-toolbar">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Buscar por ID, documento o método..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-md border border-border bg-background"
              />
            </div>
          </div>

          <div className="sb-card__content">
            {filteredPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchTerm 
                  ? "No se encontraron pagos con los filtros aplicados" 
                  : "No hay pagos registrados"}
              </p>
            ) : (
              <div className="sb-table-wrapper">
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>ID Pago</th>
                      <th>Fecha</th>
                      <th>Documento</th>
                      <th className="text-right">Importe</th>
                      <th>Método</th>
                      <th>Estado Documento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="font-mono text-xs">{payment.externalId || payment.id}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-muted-foreground" />
                            {new Date(payment.date).toLocaleDateString('es-ES')}
                          </div>
                        </td>
                        <td className="font-medium">
                          {payment.financeDoc?.docNumber || payment.financeDoc?.externalId || 'N/A'}
                        </td>
                        <td className="text-right font-mono font-bold">{formatCurrency(payment.amount)}</td>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {payment.method || 'Transferencia'}
                          </span>
                        </td>
                        <td>
                          {payment.financeDoc ? (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              payment.financeDoc.status === 'paid' ? 'bg-green-100 text-green-800' :
                              payment.financeDoc.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {payment.financeDoc.status === 'paid' ? 'Pagado' : 
                               payment.financeDoc.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin documento</span>
                          )}
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
