

"use client";
import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { TestTube2 } from 'lucide-react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function DevToolsLayout({ children }: { children: React.ReactNode }) {
  // We remove the AuthenticatedLayout from here since DataViewer now has its own.
  // This prevents double-layout rendering.
  return (
    <>
      {children}
    </>
  );
}
