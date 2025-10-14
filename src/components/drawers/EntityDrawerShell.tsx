"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function EntityDrawerShell({
  title,
  subtitle,
  actions,
  tabs,
  children,
  footer,
  isOpen = true,
  onClose,
  density = "comfortable",
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  density?: "comfortable" | "compact";
}) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const close = () => {
    setExiting(true);
    setTimeout(() => {
      if (onClose) onClose();
      else router.back();
      setExiting(false);
    }, 220); // coincide con .sb-drawer--exit
  };

  // bloquear scroll del body al abrir (móvil)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen && !exiting) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`sb-drawer__overlay ${exiting ? "sb-drawer__overlay--exit" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer (bottom en móvil, lateral en desktop) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-density={density}
        className={`sb-drawer ${exiting ? "sb-drawer--exit" : ""}`}
      >
        {/* Handler móvil */}
        <div className="sb-drawer__handle" aria-hidden="true" />

        {/* Header */}
        <div className="sb-drawer__header sb-header-glass">
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold truncate">{title}</h2>
            {subtitle && (
              <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={close}
              className="sb-btn sb-btn--icon sb-btn--ghost focus-ring"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actions row */}
        {actions && (
          <div className="p-2 md:p-3 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
        )}

        {/* Tabs mejoradas */}
        {tabs && <div className="sb-tabs">{tabs}</div>}

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 md:p-4">
          {children}
        </div>

        {/* Footer sticky elegante */}
        {footer && (
          <div className="sb-drawer__footer">
            <div className="flex justify-end gap-2">{footer}</div>
          </div>
        )}
      </aside>
    </>
  );
}
