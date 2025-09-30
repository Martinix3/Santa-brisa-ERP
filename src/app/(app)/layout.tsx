
// src/app/(app)/layout.tsx
"use client";

import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';
import Loading from '../loading';
import { useRouter } from 'next/navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, authReady } = useData();
  const router = useRouter();

  React.useEffect(() => {
    if (authReady && !currentUser) {
      console.log('[AppLayout] No currentUser, redirecting to /login');
      router.push('/login');
    }
  }, [authReady, currentUser, router]);

  if (!authReady) {
    // Show a loader while authentication state is being determined.
    return <Loading />;
  }

  if (!currentUser) {
    // If auth is ready but there's no user, it means we are about to redirect.
    // Showing a loader here prevents a flash of the login page on initial load for an authenticated user.
    return <Loading />;
  }

  return (
      <AuthenticatedLayout>
          {children}
      </AuthenticatedLayout>
  );
}
