// src/app/(app)/layout.tsx
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import React from 'react';

// This layout is now a clean Server Component.
// It wraps its children with the AuthenticatedLayout, which will handle all
// client-side authentication checks. This separation is a best practice
// in Next.js App Router and solves the ChunkLoadError.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
