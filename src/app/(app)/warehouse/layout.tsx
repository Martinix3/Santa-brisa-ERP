
"use client";
import React from 'react';
import { WarehouseNav } from '@/features/warehouse/components/ui-sb-warehouse';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Warehouse } from 'lucide-react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout>
      <ModuleHeader title="Almacén" icon={Warehouse} />
      <WarehouseNav />
      <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
      </div>
    </AuthenticatedLayout>
  );
}
