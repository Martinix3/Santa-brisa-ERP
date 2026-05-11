"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DrawerContextValue = {
  close: () => void;
  ruleId?: string;
  alertKey?: string;
  taskKey?: string;
  source?: string;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawerContext() {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error("useDrawerContext must be used within a BaseDrawer");
  }
  return ctx;
}

export interface BaseDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  density?: "comfortable" | "compact";
  className?: string;
  context?: Omit<DrawerContextValue, "close">;
  initialFocusRef?: React.RefObject<HTMLElement>;
  preventCloseOnOverlay?: boolean;
}

const ANIMATION_MS = 220;

export function BaseDrawer({
  open,
  onClose,
  title,
  subtitle,
  actions,
  tabs,
  children,
  footer,
  density = "comfortable",
  className,
  context,
  initialFocusRef,
  preventCloseOnOverlay = false,
}: BaseDrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [render, setRender] = useState(open);
  const [drawerState, setDrawerState] = useState<"open" | "closed">("closed");

  useEffect(() => {
    if (open) {
      setRender(true);
      requestAnimationFrame(() => setDrawerState("open"));
    } else {
      setDrawerState("closed");
      const timeout = setTimeout(() => setRender(false), ANIMATION_MS);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const focusFirstElement = useCallback(() => {
    const container = drawerRef.current;
    if (!container) return;

    const target = initialFocusRef?.current ?? findFocusable(container)[0] ?? closeButtonRef.current;
    target?.focus({ preventScroll: true });
  }, [initialFocusRef]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    focusFirstElement();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, focusFirstElement]);

  useEffect(() => {
    if (!open && previousFocusRef.current) {
      previousFocusRef.current.focus({ preventScroll: true });
      previousFocusRef.current = null;
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const container = drawerRef.current;
      if (!container) return;

      const focusable = findFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    if (!render) return;
    const node = drawerRef.current;
    if (!node) return;
    node.addEventListener("keydown", handleKeyDown);
    return () => node.removeEventListener("keydown", handleKeyDown);
  }, [render, handleKeyDown]);

  const handleOverlayClick = useCallback(() => {
    if (!preventCloseOnOverlay) {
      onClose();
    }
  }, [preventCloseOnOverlay, onClose]);

  const contextValue = useMemo<DrawerContextValue>(
    () => ({
      close: onClose,
      ruleId: context?.ruleId,
      alertKey: context?.alertKey,
      taskKey: context?.taskKey,
      source: context?.source,
    }),
    [context, onClose]
  );

  if (!render) return null;

  return (
    <>
      <div
        className="sb-overlay"
        data-state={drawerState}
        aria-hidden="true"
        onClick={handleOverlayClick}
      />

      <DrawerContext.Provider value={contextValue}>
        <aside
          ref={drawerRef}
          className={cn("sb-drawer", className)}
          data-state={drawerState}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-density={density}
        >
          <div className="sb-drawer__handle" aria-hidden="true" />

          <div className="sb-drawer__header sb-header-glass">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base md:text-lg font-semibold truncate">
                {title}
              </h2>
              {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="sb-btn sb-btn--icon sb-btn--ghost focus-ring"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {actions && (
            <div className="p-2 md:p-3 border-b border-border bg-card/50 backdrop-blur-sm">
              <div className="flex flex-wrap gap-2">{actions}</div>
            </div>
          )}

          {tabs && <div className="sb-tabs">{tabs}</div>}

          <div className="flex-1 overflow-auto p-3 md:p-4">{children}</div>

          {footer && (
            <div className="sb-drawer__footer">
              <div className="flex justify-end gap-2">{footer}</div>
            </div>
          )}
        </aside>
      </DrawerContext.Provider>
    </>
  );
}

function findFocusable(root: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));
  return elements.filter((el) => !el.hasAttribute("aria-hidden") && el.getAttribute("tabindex") !== "-1");
}

