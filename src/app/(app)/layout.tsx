
// src/app/(app)/layout.tsx
"use client";

import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';
import Loading from '../loading';
import { useRouter, usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, authReady, firebaseUser, loadingData } = useData();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!authReady) return;
    // If auth is ready but there's no firebase user, redirect to login.
    // This is the main guard for all routes under the (app) group.
    if (!firebaseUser) {
      router.replace('/login');
    }
  }, [authReady, firebaseUser, router]);

  // Show a loading screen while auth state is being determined
  // or if we have a user but are still fetching their app-specific data.
  const isBlocking = !authReady || (!!firebaseUser && loadingData);

  if (isBlocking) {
    return <Loading />;
  }
  
  // If we have a firebaseUser but no corresponding currentUser in our DB,
  // it's an invalid state (or data is still loading). The isBlocking check
  // covers the loading part, so this is an extra guard.
  if (firebaseUser && !currentUser) {
      return <Loading />;
  }

  // If there's no firebaseUser at all after checks, something is wrong,
  // but the useEffect will redirect. In the meantime, don't render the authed layout.
  if (!firebaseUser) {
    return <Loading />;
  }

  return (
    <AuthenticatedLayout>
      {children}
    </AuthenticatedLayout>
  );
}
