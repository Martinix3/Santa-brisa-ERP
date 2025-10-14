// src/app/(app)/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";
import QuickLogOverlay from "@/features/quicklog/QuickLogOverlay";
import { isSales } from "@/lib/authz";
import Loading from "@/app/loading";
import { Sidebar } from "@/components/layout/Sidebar";
import { DynamicHeader } from "@/components/layout/DynamicHeader";
import { ProfileDrawer } from "@/components/layout/ProfileDrawer";
import { BottomNav } from "@/components/layout/BottomNav";
import { RealtimeToggle } from "@/components/RealtimeToggle";
import { PersistenceToggle } from "@/components/ui/PersistenceToggle";

type AlertItem = {
  id: string;
  title: string;
  desc?: string;
  time?: string;
  read?: boolean;
};

/**
 * Authenticated Layout for Next.js App Router
 * 
 * This layout wraps all routes under (app)/* and provides:
 * - Authentication guard (redirects to /login if not authenticated)
 * - Persistent UI (Sidebar, Header, Navigation) across page navigations
 * - User-specific features based on role
 * - Global drawer slot for intercepted routes
 * 
 * IMPORTANT: This layout persists between page navigations within (app)/*
 * State like profileOpen, alerts, etc. will be maintained across routes.
 */
export default function AppLayout({ 
  children,
  drawer,
}: { 
  children: React.ReactNode;
  drawer: React.ReactNode;
}) {
  const router = useRouter();
  const { currentUser, logout, authReady, firebaseUser } = useData();

  // UI State
  const [profileOpen, setProfileOpen] = useState(false);
  // TODO: Implement real alerts from database
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  /**
   * Authentication Guard
   * Redirects to /login if user is not authenticated
   * CRITICAL: Must check authReady before redirecting to avoid flickering
   */
  useEffect(() => {
    if (authReady && !firebaseUser) {
      router.replace("/login");
    }
  }, [authReady, firebaseUser, router]);

  // Handlers
  const markAllRead = () => {
    setAlerts((list) => list.map((a) => ({ ...a, read: true })));
  };

  const handleClickAlert = (alert: AlertItem) => {
    setAlerts((list) => list.map((a) => (a.id === alert.id ? { ...a, read: true } : a)));
    // TODO: navegar a detalle/contexto
    console.log("Clicked alert:", alert);
  };

  const handleOpenSearch = () => {
    console.log("TODO: Open global search");
  };

  const handleQuickCreate = () => {
    console.log("TODO: Open quick create dialog");
  };

  // Loading state
  if (!authReady || !firebaseUser || !currentUser) {
    return <Loading />;
  }

  const isPrivilegedUser =
    currentUser?.role?.toLowerCase() === "admin" ||
    currentUser?.role?.toLowerCase() === "owner";

  return (
    <>
      {/* PIEL GLOBAL: sb-app + sb-main + sb-page */}
      <div className="sb-app flex flex-col md:flex-row">
        {/* Desktop/Tablet Sidebar */}
        <Sidebar isAdmin={isPrivilegedUser} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative z-0">
          {/* Unified Dynamic Header */}
          <DynamicHeader
            alerts={alerts}
            onOpenSearch={handleOpenSearch}
            onOpenProfileDrawer={() => setProfileOpen(true)}
            onMarkAllRead={markAllRead}
            onClickAlert={handleClickAlert}
          />

          {/* Page Content */}
          <main id="main-content" className="sb-main">
            {children}
          </main>

          {/* Global Drawer Slot */}
          {drawer}
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav isAdmin={isPrivilegedUser} />
      </div>

      {/* Profile Drawer with Santabrain */}
      <ProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={{
          name: currentUser?.name,
          email: currentUser?.email,
          role: currentUser?.role,
        }}
        onLogout={logout}
        TabPerfil={
          <div className="space-y-4">
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-xs font-medium text-muted-foreground">Configuración</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tiempo real</span>
                  <RealtimeToggle />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Persistencia</span>
                  <PersistenceToggle />
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* QuickLog Overlay */}
      {(isSales(currentUser?.role) || currentUser?.role === "admin") && (
        <QuickLogOverlay />
      )}
    </>
  );
}
