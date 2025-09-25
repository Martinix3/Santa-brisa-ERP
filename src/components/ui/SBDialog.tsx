"use client";
import * as React from "react";
import { SB_THEME } from "@/domain/ssot";

type Action =
  | { label: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }
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
  return (
    <div className={`fixed inset-0 z-[100] ${open ? "block" : "hidden"}`} aria-hidden={!open} role="dialog">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 grid place-items-center p-4">{children}</div>
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
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  primaryAction?: Action;
  secondaryAction?: Action;
  maxWidth?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="w-full" style={{ maxWidth }}>
      <div className="sb-card w-full bg-white border p-4 md:p-6">
        {(title || description) && (
          <header className="mb-4">
            {title && <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>}
            {description && <p className="text-sm text-zinc-600 mt-1">{description}</p>}
          </header>
        )}
        <div className="space-y-4">{children}</div>
        {(primaryAction || secondaryAction) && (
          <footer className="mt-6 flex items-center justify-end gap-2">
            {secondaryAction && (
              <button
                type={secondaryAction.type ?? "button"}
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                className="sb-btn-primary h-10 px-4 rounded-md border border-zinc-200 bg-white text-zinc-800 text-sm"
              >
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                type={primaryAction.type ?? "button"}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="sb-btn-primary h-10 px-4 text-sm"
              >
                {primaryAction.label}
              </button>
            )}
          </footer>
        )}
      </div>
    </form>
  );
}
