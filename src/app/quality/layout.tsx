
"use client";
import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ClipboardCheck } from 'lucide-react';

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModuleHeader title="Control de Calidad" icon={ClipboardCheck} />
      <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 px-4">
            {children}
          </div>
      </div>
    </>
  );
}
