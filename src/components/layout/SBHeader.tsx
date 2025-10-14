// src/components/layout/SBHeader.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Menu, Search, PlusCircle, Bell, X, UserCircle } from "lucide-react";

type AlertItem = {
  id: string;
  title: string;
  desc?: string;
  time?: string; // "hace 5 min"
  read?: boolean;
};

export function SBHeader({
  title,
  alerts = [],
  onToggleSidebar,
  onQuickCreate,
  onOpenSearch,
  onOpenProfileDrawer,
  onMarkAllRead,
  onClickAlert,
}: {
  title?: string;
  alerts?: AlertItem[];
  onToggleSidebar?: () => void;
  onQuickCreate?: () => void;
  onOpenSearch?: () => void;
  onOpenProfileDrawer?: () => void;
  onMarkAllRead?: () => void;
  onClickAlert?: (a: AlertItem) => void;
}) {
  const [openAlerts, setOpenAlerts] = useState(false);
  const alertsRef = useRef<HTMLDivElement | null>(null);
  const unread = alerts.filter((a) => !a.read).length;

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

  return (
    <header className="h-10 md:h-14 px-3 md:px-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-lg backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60">
      {/* Izquierda: menú + título (colapsa en móvil) */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          className="md:hidden p-1 rounded-md focus-ring hover:bg-secondary"
          aria-label="Abrir menú"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>
        {title && (
          <h1 className="text-sm md:text-base font-medium truncate">{title}</h1>
        )}
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-1 md:gap-2">
        <button
          className="p-1 rounded-md focus-ring hover:bg-secondary transition-colors"
          aria-label="Buscar"
          onClick={onOpenSearch}
          title="Buscar"
        >
          <Search size={18} />
        </button>

        <div className="relative" ref={alertsRef}>
          <button
            className="relative p-1 rounded-md focus-ring hover:bg-secondary transition-colors"
            aria-label="Alertas"
            onClick={() => setOpenAlerts((v) => !v)}
            title="Alertas"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span
                aria-label={`${unread} alertas sin leer`}
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium grid place-items-center leading-none"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {/* Panel de alertas */}
          {openAlerts && (
            <div
              role="dialog"
              aria-label="Notificaciones"
              className="absolute right-0 mt-2 w-[92vw] max-w-[380px] rounded-lg border bg-card shadow-lg overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <strong className="text-sm font-semibold">Notificaciones</strong>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                      onClick={onMarkAllRead}
                      title="Marcar todas como leídas"
                    >
                      Marcar todas
                    </button>
                  )}
                  <button
                    className="p-1 rounded-md hover:bg-secondary focus-ring transition-colors"
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
                      <p className="text-muted-foreground truncate text-xs mt-0.5">{a.desc}</p>
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
          className="p-1 rounded-md focus-ring hover:bg-secondary transition-colors"
          aria-label="Nuevo"
          title="Crear rápido"
          onClick={onQuickCreate}
        >
          <PlusCircle size={18} />
        </button>

        <button
          className="hidden md:inline-flex p-1 rounded-md focus-ring hover:bg-secondary transition-colors"
          aria-label="Perfil"
          title="Perfil y Santabrain"
          onClick={onOpenProfileDrawer}
        >
          <UserCircle size={20} />
        </button>
      </div>
    </header>
  );
}
