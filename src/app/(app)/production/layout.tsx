
"use client";
import React from 'react';
import { ProductionLayout } from '@/features/production/components/ui';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex-grow">
          <div className="max-w-full mx-auto py-6 px-4">
            <ProductionLayout>{children}</ProductionLayout>
          </div>
      </div>
    </>
  );
}
