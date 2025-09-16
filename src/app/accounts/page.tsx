

"use client"
import React from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { AccountsPageContent } from '@/features/accounts/components/AccountsPage';

export default function Page(){
    return (
        <AuthGuard>
            <AuthenticatedLayout>
                <AccountsPageContent />
            </AuthenticatedLayout>
        </AuthGuard>
    )
}
