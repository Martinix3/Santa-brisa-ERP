
"use client";
import * as React from "react";
import { X } from "lucide-react";

type Action =
  | { label: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; type?: "button" | "submit"; disabled?: boolean }
  | undefined;

export function SBDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4`} aria-hidden={!open} role="dialog">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function SBDialogContent({
  title,
  description,
  children,
  onSubmit,
  primaryAction,
  secondaryAction,
  maxWidth = "32rem",
}: {
  title?: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  primaryAction?: Action;
  secondaryAction?: Action;
  maxWidth?: string;
}) {
  return (
    <div className="sb-card mx-auto w-full bg-white border" style={{ maxWidth }} >
      <form onSubmit={onSubmit}>
        <div className="p-4 md:p-6">
          {(title || description) && (
            <header className="mb-4">
              {title && <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
                </div>
              }
              {description && <p className="text-sm text-zinc-600 mt-1">{description}</p>}
            </header>
          )}
          <div className="space-y-4">{children}</div>
        </div>
        {(primaryAction || secondaryAction) && (
          <footer className="mt-6 flex items-center justify-end gap-2 p-4 bg-zinc-50 border-t">
            {secondaryAction && (
              <button
                type={secondaryAction.type ?? "button"}
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                className="h-10 px-4 rounded-lg border border-zinc-200 bg-white text-zinc-800 text-sm font-semibold transition-colors hover:bg-zinc-100"
              >
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                type={primaryAction.type ?? "button"}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="h-10 px-4 rounded-lg bg-zinc-900 text-white text-sm font-semibold transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {primaryAction.label}
              </button>
            )}
          </footer>
        )}
      </form>
    </div>
  );
}
