// src/components/sb-funda/SBScaffold.tsx
"use client";
import React from "react";
import { cn } from "@/lib/utils"; 

type Accent = "personal" | "ventas" | "marketing" | "logistica" | "produc" | "calidad" | "finance" | "admin";

export function SBScaffold({
  module = "produc",
  title,
  subtitle,
  headerRight,
  sidebar,
  children,
  density = "normal",
}: {
  module?: Accent;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  density?: "compact" | "normal";
}) {
  return (
    <div className={cn("mx-auto max-w-screen-2xl", density === "compact" ? "px-5" : "px-6")}>
      {/* HEADER sticky */}
      <header
        className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
        style={{ ["--tone" as any]: `var(--sb-accent-${module})` }}
      >
        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-zinc-600">{subtitle}</p>}
          </div>
          <div className="shrink-0">{headerRight}</div>
        </div>
      </header>

      {/* GRID */}
      <div className={cn("py-6 grid grid-cols-1 lg:grid-cols-12 gap-6")}>
        {sidebar && <aside className="lg:col-span-3">{sidebar}</aside>}
        <main className={cn(sidebar ? "lg:col-span-9" : "lg:col-span-12")}>{children}</main>
      </div>
    </div>
  );
}

/* Tarjeta neutral — estética BOM */
export function SBCardBox({
  title,
  subtitle,
  accentTone, // ej: "produc" para resaltar cabecera
  right,
  children,
  footer,
  className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  accentTone?: Accent | null;
  right?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("sb-card rounded-2xl border bg-white shadow-sm overflow-hidden", className)}>
      {(title || right) && (
        <div
          className={cn(
            "sb-card__header justify-between",
            "flex items-center gap-3 px-4 py-3 border-b",
            accentTone && "bg-[hsl(var(--tone)/0.08)]"
          )}
          style={accentTone ? ({ ["--tone" as any]: `var(--sb-accent-${accentTone})` } as any) : undefined}
        >
          <div>
            {title && <h2 className="text-base font-semibold text-zinc-900">{title}</h2>}
            {subtitle && <p className="text-xs text-zinc-600">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="sb-card__content p-4">{children}</div>
      {footer && <div className="sb-card__footer px-4 py-3 border-t bg-zinc-50">{footer}</div>}
    </section>
  );
}

/* Botones ligeros al estilo BOM */
export function SBBtn({
  children,
  variant = "ghost",
  tone = "produc",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost" | "danger";
  tone?: Accent;
}) {
  const base = "h-10 px-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  if (variant === "danger") {
    return (
      <button
        {...props}
        className={cn(base, "bg-rose-600 text-white hover:brightness-110", className)}
      >
        {children}
      </button>
    );
  }
  if (variant === "solid") {
    return (
      <button
        {...props}
        className={cn(
          base,
          "text-white hover:brightness-110",
          className
        )}
        style={{ backgroundColor: `hsl(var(--sb-accent-${tone}))` } as any}
      >
        {children}
      </button>
    );
  }
  // ghost
  return (
    <button
      {...props}
      className={cn(
        base,
        "border",
        className
      )}
      style={{
        color: `hsl(var(--sb-accent-${tone}))`,
        borderColor: `hsl(var(--sb-accent-${tone}) / .30)`,
        backgroundColor: "hsl(var(--sb-accent-tone}) / .06)" as any,
      }}
    >
      {children}
    </button>
  );
}

export function SpinnerButton(props: React.ComponentProps<typeof SBBtn> & { loading?: boolean }) {
  const { loading, children, ...rest } = props;
  return (
    <SBBtn {...rest} disabled={loading || rest.disabled} className="relative">
      {loading && <span className="absolute inset-0 grid place-items-center"><span className="h-4 w-4 border-2 border-current border-b-transparent rounded-full animate-spin" /></span>}
      <span className={loading ? "opacity-0" : "opacity-100"}>{children}</span>
    </SBBtn>
  );
}
