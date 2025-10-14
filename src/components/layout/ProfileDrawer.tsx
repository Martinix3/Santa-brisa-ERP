// src/components/layout/ProfileDrawer.tsx
"use client";

import React, { useEffect } from "react";
import { X, LogOut, Settings, User } from "lucide-react";

export function ProfileDrawer({
  open,
  onClose,
  user,
  onLogout,
  TabPerfil,
  TabSantabrain,
}: {
  open: boolean;
  onClose: () => void;
  user?: { name?: string; email?: string; role?: string };
  onLogout?: () => void;
  TabPerfil?: React.ReactNode;
  TabSantabrain?: React.ReactNode;
}) {
  const [tab, setTab] = React.useState<"perfil" | "brain">("perfil");

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", onEsc);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <>
          {/* Overlay */}
          <div
            className="sb-drawer__overlay"
            onClick={onClose}
          />
          
          {/* Drawer Glass - mismo estilo que ContactDetailDrawer */}
          <aside
            className="sb-drawer"
            role="dialog"
            aria-label="Panel de usuario"
          >
            {/* Header with user info */}
            <div className="sb-drawer__header">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{user?.name ?? "Usuario"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  {user?.role && (
                    <span className="sb-badge sb-badge--primary mt-1">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
              <button 
                className="p-2 rounded-md hover:bg-secondary/50 focus-ring transition-colors flex-shrink-0" 
                onClick={onClose} 
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs navigation */}
            <nav className="grid grid-cols-2 text-sm border-b border-border/30 -mx-4 px-4">
              <button
                className={`py-3 font-medium transition-colors ${
                  tab === "perfil" 
                    ? "border-b-2 border-primary text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("perfil")}
              >
                Perfil
              </button>
              <button
                className={`py-3 font-medium transition-colors ${
                  tab === "brain" 
                    ? "border-b-2 border-primary text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("brain")}
              >
                Santabrain
              </button>
            </nav>

            {/* Content area (scrollable) */}
            <div className="flex-1 overflow-y-auto text-sm space-y-4">
              {tab === "perfil" ? (
                TabPerfil ?? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Settings size={16} />
                        Preferencias
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Configura tu experiencia en Santa Brisa ERP.
                      </p>
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t border-border/30">
                      <h4 className="text-xs font-medium text-muted-foreground">Información</h4>
                      <div className="space-y-1">
                        <p className="text-xs">
                          <span className="text-muted-foreground">Email:</span> {user?.email}
                        </p>
                        <p className="text-xs">
                          <span className="text-muted-foreground">Rol:</span> {user?.role || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                TabSantabrain ?? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">🧠 Santabrain</h3>
                      <p className="text-xs text-muted-foreground">
                        Tu asistente inteligente para insights y sugerencias.
                      </p>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-border/30">
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs font-medium">💡 Sugerencia</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tienes 3 pedidos pendientes de confirmación.
                        </p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs font-medium">📊 Insight</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Las ventas de esta semana están 15% por encima del promedio.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Footer with logout */}
            <div className="sb-drawer__footer">
              <button
                onClick={onLogout}
                className="sb-btn sb-btn--destructive w-full gap-2"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
