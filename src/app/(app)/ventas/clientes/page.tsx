/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Metadata } from "next";
import { getAccountsWithKPIs } from "@/server/actions/accounts";
import { ClientesListView } from "@/components/clientes/ClientesListView";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Clientes | Santa Brisa ERP",
  description: "Gestión de clientes y cuentas comerciales",
};

export default async function ClientesPage() {
  // Fetch initial data server-side
  const result = await getAccountsWithKPIs({});

  // Filter accounts to match pipeline view (exclude only CERRADA and BAJA)
  // Include accounts without stage defined (they should appear as prospects)
  const filteredAccounts = result.success && result.data 
    ? result.data.filter(account => 
        !account.stage || !['CERRADA', 'BAJA'].includes(account.stage)
      )
    : [];

  return (
    <div className="container mx-auto">
      <ClientesListView
        accounts={filteredAccounts}
      />
    </div>
  );
}
