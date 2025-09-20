
"use client";
import React from 'react';
import { AccountDetailPageContent } from '@/features/accounts/components/AccountDetailPage';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function AccountDetailPage() {
    return (
        <AuthenticatedLayout>
            <AccountDetailPageContent />
        </AuthenticatedLayout>
    );
}
