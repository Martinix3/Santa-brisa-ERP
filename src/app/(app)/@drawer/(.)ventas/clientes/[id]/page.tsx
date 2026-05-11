"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AccountDrawer } from "@/components/accounts/AccountDrawer";
import { useData } from "@/lib/dataprovider";
import { Building2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClienteDrawerPage({ params }: PageProps) {
  const router = useRouter();
  const { data } = useData();
  const { id } = use(params);
  
  // Buscar la cuenta
  const account = useMemo(() => {
    return data?.accounts?.find(a => a.id === id);
  }, [data?.accounts, id]);

  if (!account) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-end">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => router.back()}
        />
        
        {/* Drawer */}
        <div className="relative w-full max-w-4xl h-full bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Building2 size={48} className="text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Cliente no encontrado</h2>
            <p className="text-muted-foreground text-center mb-6">
              No se encontró el cliente con ID: {id}
            </p>
            <button
              onClick={() => router.back()}
              className="sb-btn sb-btn--primary"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccountDrawer 
      account={account} 
      onClose={() => router.back()} 
    />
  );
}
