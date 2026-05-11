/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import HoldedSyncPanel from "@/components/finanzas/HoldedSyncPanel";
import AccountsSyncStatus from "@/components/finanzas/AccountsSyncStatus";

export default function SincronizacionPage() {
  return (
    <div className="sb-page">
      <div className="sb-page__header mb-6">
        <h1 className="sb-page__title">Sincronización Completa</h1>
        <p className="sb-page__subtitle">
          Gestión centralizada de Holded (cuentas, pedidos, facturas) + Shopify (pedidos, clientes)
        </p>
      </div>

      <div className="space-y-8">
        {/* Panel de sincronización con stats y acciones */}
        <HoldedSyncPanel />

        {/* Tabla de estado por cuenta */}
        <AccountsSyncStatus />
      </div>
    </div>
  );
}
