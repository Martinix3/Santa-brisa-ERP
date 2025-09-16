

"use client";
import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ProductionLayout } from '@/features/production/components/ui';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Factory } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout>
      <ModuleHeader title="Producción" icon={Factory} />
      <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <ProductionLayout>{children}</ProductionLayout>
          </div>
      </div>
    </AuthenticatedLayout>
  );
}
