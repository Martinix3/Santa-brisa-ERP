/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Metadata } from "next";
import { Suspense } from "react";
import { getOrdersWithAccounts } from "@/server/actions/orders";
import { PedidosContent } from "@/components/orders/PedidosContent";
import { Package } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Pedidos | Santa Brisa ERP",
  description: "Gestión de pedidos con filtros inteligentes y visualización optimizada",
};

export default async function PedidosPage() {
  const result = await getOrdersWithAccounts();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Pedidos
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Gestión completa de pedidos con visualización por flujo comercial
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Package className="w-12 h-12 animate-pulse text-neutral-400" />
              <p className="text-neutral-600 dark:text-neutral-400">Cargando pedidos...</p>
            </div>
          </div>
        }
      >
        <PedidosContent
          initialOrders={result.success && result.data ? result.data : []}
        />
      </Suspense>
    </div>
  );
}
