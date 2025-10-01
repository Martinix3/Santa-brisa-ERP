// src/components/ui/SBDialog.tsx
"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { SBButton } from "./ui-primitives";
import { X } from "lucide-react";

type DialogContextType = {
  onClose: () => void;
};
const DialogContext = React.createContext<DialogContextType | null>(null);

type SBDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
};

export function SBDialog({ open, onOpenChange, children }: SBDialogProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <DialogContext.Provider value={{ onClose: () => onOpenChange(false) }}>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50">
        <div className="sb-dialog__overlay" onClick={() => onOpenChange(false)} />
        <div className="sb-dialog__content">
          {children}
        </div>
      </div>
    </DialogContext.Provider>,
    document.body
  );
}

type SBDialogContentProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  primaryAction?: { label: string; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; };
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean; };
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  maxWidth?: string;
};

export const SBDialogContent = React.forwardRef<HTMLDivElement, SBDialogContentProps>(
  ({ title, description, children, primaryAction, secondaryAction, onSubmit, maxWidth }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) {
        throw new Error("SBDialogContent must be used within SBDialog");
    }
    const { onClose } = context;

    return (
      <div ref={ref} className="sb-dialog relative" style={{ maxWidth: maxWidth || '640px' }} onClick={e => e.stopPropagation()}>
        <form onSubmit={onSubmit}>
          <SBButton type="button" variant="ghost" className="sb-dialog__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></SBButton>
          <div className="sb-dialog__header">
            {title && <div className="sb-dialog__title">{title}</div>}
            {description && <p className="sb-dialog__desc">{description}</p>}
          </div>
          <div className="sb-dialog__body">{children}</div>
          {(primaryAction || secondaryAction) && (
            <div className="sb-dialog__footer">
                {secondaryAction && <SBButton type="button" variant="secondary" onClick={secondaryAction.onClick} disabled={secondaryAction.disabled}>{secondaryAction.label}</SBButton>}
                {primaryAction && <SBButton type={primaryAction.type || 'button'} onClick={primaryAction.onClick} disabled={primaryAction.disabled}>{primaryAction.label}</SBButton>}
            </div>
          )}
        </form>
      </div>
    );
  }
);
SBDialogContent.displayName = "SBDialogContent";
