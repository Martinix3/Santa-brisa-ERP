"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navSections } from "./Sidebar";
import { Search, Bell, UserCircle, X } from "lucide-react";

type AlertItem = {
  id: string;
  title: string;
  desc?: string;
  time?: string;
  read?: boolean;
};

type DynamicHeaderProps = {
  pageControls?: React.ReactNode;
  alerts?: AlertItem[];
  onOpenSearch?: () => void;
  onOpenProfileDrawer?: () => void;
  onMarkAllRead?: () => void;
  onClickAlert?: (a: AlertItem) => void;
};

export function DynamicHeader({
  pageControls,
  alerts = [],
  onOpenSearch,
  onOpenProfileDrawer,
  onMarkAllRead,
  onClickAlert,
}: DynamicHeaderProps) {
  const pathname = usePathname() ?? "/";
  const [openAlerts, setOpenAlerts] = useState(false);
  const alertsRef = useRef<HTMLDivElement | null>(null);
  
  // Find current section based on pathname
  const currentSection = navSections.find((section) => {
    if (section.items.some((item) => pathname.startsWith(item.href))) return true;
    if (section.href && pathname.startsWith(section.href)) return true;
    return false;
  });

  // Find active page for title
  const activePage = currentSection?.items.find((item) => pathname.startsWith(item.href));
  const pageTitle = activePage?.label || currentSection?.title || "";
  
  const hasSubItems = currentSection?.items && currentSection.items.length > 0;
  const unread = alerts.filter((a) => !a.read).length;

  // Close alerts dropdown on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!openAlerts) return;
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setOpenAlerts(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openAlerts]);

  if (!currentSection) {
    return null;
  }

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="px-4 md:px-6">
        {/* Línea 1: Título + Controles + Acciones */}
        <div className="flex items-center justify-between gap-4 h-14">
          {/* Título de sección */}
          <h1 className="text-lg md:text-xl font-bold truncate min-w-0">
            {pageTitle}
          </h1>

          {/* Controles personalizados de la página */}
          {pageControls && (
            <div className="flex items-center gap-3 flex-1 justify-center">
              {pageControls}
            </div>
          )}

          {/* Acciones globales */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="p-2 rounded-md hover:bg-secondary transition-colors"
              aria-label="Buscar"
              onClick={onOpenSearch}
              title="Buscar (⌘K)"
            >
              <Search size={18} />
            </button>

            <div className="relative" ref={alertsRef}>
              <button
                className="relative p-2 rounded-md hover:bg-secondary transition-colors"
                aria-label="Notificaciones"
                onClick={() => setOpenAlerts((v) => !v)}
                title="Notificaciones"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute top-0 right-0 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {/* Panel de alertas */}
              {openAlerts && (
                <div className="absolute right-0 mt-2 w-[92vw] max-w-[380px] rounded-lg border bg-card shadow-lg overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-200">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <strong className="text-sm font-semibold">Notificaciones</strong>
                    <div className="flex items-center gap-2">
                      {unread > 0 && (
                        <button
                          className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                          onClick={onMarkAllRead}
                        >
                          Marcar todas
                        </button>
                      )}
                      <button
                        className="p-1 rounded-md hover:bg-secondary transition-colors"
                        onClick={() => setOpenAlerts(false)}
                        aria-label="Cerrar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <ul className="max-h-[60vh] overflow-auto divide-y">
                    {alerts.length === 0 && (
                      <li className="p-4 text-sm text-muted-foreground text-center">
                        No hay notificaciones.
                      </li>
                    )}
                    {alerts.map((a) => (
                      <li
                        key={a.id}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary transition-colors ${
                          a.read ? "" : "bg-primary/5 border-l-2 border-primary"
                        }`}
                        onClick={() => onClickAlert?.(a)}
                      >
                        <p className="font-medium truncate">{a.title}</p>
                        {a.desc && (
                          <p className="text-muted-foreground truncate text-xs mt-0.5">
                            {a.desc}
                          </p>
                        )}
                        {a.time && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {a.time}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              className="p-2 rounded-md hover:bg-secondary transition-colors"
              aria-label="Perfil"
              title="Perfil"
              onClick={onOpenProfileDrawer}
            >
              <UserCircle size={20} />
            </button>
          </div>
        </div>

        {/* Línea 2: Tabs de navegación (solo si hay) */}
        {hasSubItems && (
          <div className="flex gap-1 overflow-x-auto hide-scrollbar -mb-px pb-0">
            {currentSection.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
