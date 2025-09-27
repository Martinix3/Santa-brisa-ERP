"use client";
import React from 'react';
import { ProductionLayout } from '@/features/production/components/ui';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex-grow">
          {children}
      </div>
    </>
  );
}
