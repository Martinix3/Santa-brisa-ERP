"use client";

import { X } from "lucide-react";

export function ActionDialogShell({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  primaryText = "Guardar",
  secondaryText = "Cancelar",
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primaryText?: string;
  secondaryText?: string;
  onSubmit?: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const close = () => {
    onOpenChange(false);
    onCancel?.();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed z-[71] inset-x-0 bottom-0 md:inset-auto md:right-6 md:bottom-6 md:w-[560px]
                   bg-card rounded-t-2xl md:rounded-2xl shadow-2xl border"
      >
        <div className="p-4 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold truncate">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <button
            className="sb-btn sb-btn--icon sb-btn--ghost"
            onClick={close}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] md:max-h-[60vh] overflow-auto">{children}</div>

        <div className="p-3 border-t flex justify-end gap-2">
          <button className="sb-btn sb-btn--secondary" onClick={close}>
            {secondaryText}
          </button>
          <button
            className="sb-btn sb-btn--primary"
            onClick={async () => {
              await onSubmit?.();
              onOpenChange(false);
            }}
          >
            {primaryText}
          </button>
        </div>
      </div>
    </>
  );
}
