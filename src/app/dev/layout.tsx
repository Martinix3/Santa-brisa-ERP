
"use client";
import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { TestTube2 } from 'lucide-react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function DevToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout>
      <ModuleHeader title="Herramientas de Desarrollo" icon={TestTube2} />
      <div className="flex-grow">
          <div className="max-w-full mx-auto py-6 px-4">
            {children}
          </div>
      </div>
    </AuthenticatedLayout>
  );
}
