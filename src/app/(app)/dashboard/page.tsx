"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";

export default function DashboardRedirect() {
  const { firebaseUser, authReady } = useData();
  const router = useRouter();

  useEffect(() => {
    if (authReady && firebaseUser) {
      // Redirigir a calendario filtrado por usuario
      router.replace(`/calendario?userId=${firebaseUser.uid}`);
    }
  }, [authReady, firebaseUser, router]);

  return (
    <div className="sb-page">
      <div className="sb-card-glass-light p-6 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3"></div>
        <p className="text-muted-foreground">Redirigiendo a tu calendario...</p>
      </div>
    </div>
  );
}
