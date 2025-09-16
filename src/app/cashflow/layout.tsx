

"use client";
import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { LineChart } from 'lucide-react';

export default function CashflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout>
      <ModuleHeader title="Finanzas y Tesorería" icon={LineChart} />
      <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 px-4">
            {children}
          </div>
      </div>
    </AuthenticatedLayout>
  );
}
