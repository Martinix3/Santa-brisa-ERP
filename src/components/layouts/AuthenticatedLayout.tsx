// src/components/layouts/AuthenticatedLayout.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { Avatar } from "@/components/ui/Avatar";
import QuickLogOverlay from "@/features/quicklog/QuickLogOverlay";
import { isSales } from "@/lib/authz";
import { RealtimeToggle } from "../RealtimeToggle";
import { PersistenceToggle } from "../ui/PersistenceToggle";
import Loading from "@/app/loading";
import { Sidebar } from "../layout/Sidebar";
import { Header } from "../layout/Header";
import { BottomNav } from "../layout/BottomNav";

/* ===== Layout principal ===== */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, logout, authReady, firebaseUser } = useData();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Si la autenticación está lista y no hay usuario, redirige al login
    if (authReady && !firebaseUser) {
      router.replace("/login");
    }
  }, [authReady, firebaseUser, router]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userMenuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [userMenuOpen]);

  // Loading state
  if (!authReady || !firebaseUser || !currentUser) {
    return <Loading />;
  }

  const isPrivilegedUser =
    currentUser?.role?.toLowerCase() === "admin" ||
    currentUser?.role?.toLowerCase() === "owner";

  return (
    <>
      <div className="h-screen flex flex-col md:flex-row bg-background">
        {/* Desktop/Tablet Sidebar */}
        <Sidebar isAdmin={isPrivilegedUser} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header
            userName={currentUser?.name}
            onOpenSearch={() => console.log("TODO: Open search")}
            onOpenNotifications={() => console.log("TODO: Open notifications")}
            notificationCount={0}
          />

          {/* Page Content */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto bg-secondary pb-16 md:pb-0"
          >
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav isAdmin={isPrivilegedUser} />

        {/* User Menu (Floating - Desktop only) */}
        <div ref={menuRef} className="hidden md:block fixed bottom-4 left-4 z-50">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-label="Abrir menú de usuario"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            className="rounded-full focus-ring shadow-lg"
          >
            <Avatar name={currentUser?.name} size="md" />
          </button>
          {userMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 mb-2 w-64 p-1 bg-card border rounded-lg shadow-lg"
            >
              <div className="p-3 border-b">
                <p className="text-sm font-semibold truncate">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser?.email}
                </p>
              </div>
              <div className="p-1 space-y-1">
                <Link
                  href="/profile"
                  role="menuitem"
                  className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary focus-ring"
                >
                  Perfil
                </Link>
                <div className="px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tiempo real</span>
                    <RealtimeToggle />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Persistencia</span>
                    <PersistenceToggle />
                  </div>
                </div>
                <button
                  onClick={logout}
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary focus-ring flex items-center gap-2 text-destructive"
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QuickLog Overlay */}
      {(isSales(currentUser?.role) || currentUser?.role === "admin") && (
        <QuickLogOverlay />
      )}
    </>
  );
}
