
"use client"
import React from 'react';
import { AccountsPageContent } from '@/features/accounts/components/AccountsPage';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function Page(){
    return (
        <AuthenticatedLayout>
            <AccountsPageContent />
        </AuthenticatedLayout>
    );
}
