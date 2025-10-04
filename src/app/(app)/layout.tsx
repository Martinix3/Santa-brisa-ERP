// src/app/(app)/layout.tsx
"use client";
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import React from 'react';

// This layout is now a client component boundary.
// It wraps its children with the AuthenticatedLayout, which will handle all
// client-side authentication checks. This separation is a best practice
// in Next.js App Router and solves server rendering errors.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
