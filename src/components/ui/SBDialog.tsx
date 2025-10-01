// src/components/ui/SBDialog.tsx
"use client";
import * as React from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;      // botones primarios/secundarios
  children?: React.ReactNode;    // cuerpo
};

export function SBDialog({ open, onOpenChange, title, description, footer, children }: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };

  return createPortal(
    <div onKeyDown={onKeyDown} role="dialog" aria-modal="true">
      <div className="sb-dialog__overlay" onClick={() => onOpenChange(false)} />
      <div className="sb-dialog__content">
        <div className="sb-dialog relative">
          <button className="sb-dialog__close" onClick={() => onOpenChange(false)} aria-label="Cerrar">×</button>
          <div className="sb-dialog__header">
            {title && <div className="sb-dialog__title">{title}</div>}
            {description && <p className="sb-dialog__desc">{description}</p>}
          </div>
          <div className="sb-dialog__body">{children}</div>
          <div className="sb-dialog__footer">{footer}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}