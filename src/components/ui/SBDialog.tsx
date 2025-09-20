
"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cloneElement, isValidElement } from 'react';

interface DialogContextProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextProps | undefined>(undefined);

export const SBDialog = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;

export const SBDialogTrigger = React.forwardRef<HTMLButtonElement, { asChild?: boolean; children: React.ReactElement<any> }>(
  ({ asChild = false, children, ...props }, ref: any) => {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error("SBDialogTrigger must be used within a SBDialog");

    if (!isValidElement(children)) return null;

    const childProps: any = {
      ...props,
      ref,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        context.onOpenChange(true);
        if (typeof (children as any).props?.onClick === 'function') {
          (children as any).props.onClick(e);
        }
      },
    };

    return cloneElement(children, childProps);
  }
);
SBDialogTrigger.displayName = 'SBDialogTrigger';

interface SBDialogContentProps {
  title: string;
  description?: string;
  headerSeed?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  primaryAction: { label: string; type?: "button" | "submit"; disabled?: boolean; onClick?: () => void };
  secondaryAction: { label: string; onClick: () => void };
}

export const SBDialogContent = ({
  title,
  description,
  children,
  onSubmit,
  primaryAction,
  secondaryAction,
  size = "md",
}: SBDialogContentProps) => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("SBDialogContent must be used within a SBDialog");
  if (!context.open) return null;

  const handleOverlayClick = () => context.onOpenChange(false);
  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();
  const sizeClass = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-xl", xl: "max-w-4xl" }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`relative w-full m-4 bg-white rounded-2xl shadow-xl flex flex-col ${sizeClass}`}
        onClick={handleContentClick}
        aria-labelledby="sb-dialog-title"
        aria-describedby="sb-dialog-desc"
      >
        <form onSubmit={onSubmit}>
          <div className="p-6 border-b flex-shrink-0">
            <h2 id="sb-dialog-title" className="text-lg font-semibold text-zinc-900">
              {title}
            </h2>
            {description && (
              <p id="sb-dialog-desc" className="text-sm text-zinc-600 mt-1">
                {description}
              </p>
            )}
            <button
              type="button"
              onClick={() => context.onOpenChange(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-800 transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-zinc-50 rounded-b-2xl flex-shrink-0">
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              {secondaryAction.label}
            </button>
            <button
              type={primaryAction.type || 'button'}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
            >
              {primaryAction.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
