
// src/app/(app)/accounts/[accountId]/page.tsx

"use client";

import React, { Suspense } from 'react';
import { AccountDetailPageContent } from '@/features/accounts/components/AccountDetailPage';
import { AccountPOS } from "@/features/accounts/components/AccountPOS";
import { useParams } from 'next/navigation';
import { SBPageShell } from '@/components/ui/SBPageShell';

// Componente Skeleton para el estado de carga
function AccountPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="sb-skeleton h-48 w-full" />
            <div className="sb-skeleton h-64 w-full" />
        </div>
    );
}

export default function AccountDetailPage() {
    const params = useParams();
    const accountId = params.accountId as string;

    return (
        <SBPageShell module="sales" title="Detalle de Cliente" subtitle="Gestiona la información y puntos de venta.">
            <Suspense fallback={<AccountPageSkeleton />}>
                {accountId && (
                    <div className="space-y-6">
                        <AccountDetailPageContent />
                        <AccountPOS accountId={accountId} />
                    </div>
                )}
            </Suspense>
        </SBPageShell>
    );
}

export const dynamic = 'force-dynamic';
