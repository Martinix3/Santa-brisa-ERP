
// src/app/(app)/accounts/[accountId]/page.tsx

"use client";

import React from 'react';
import { AccountDetailPageContent } from '@/features/accounts/components/AccountDetailPage';
import { AccountPOS } from "@/features/accounts/components/AccountPOS";
import { useParams } from 'next/navigation';

export default function AccountDetailPage() {
    const params = useParams();
    const accountId = params.accountId as string;

    return (
        <div className="p-6 space-y-6">
          <AccountDetailPageContent />
          <AccountPOS accountId={accountId} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
