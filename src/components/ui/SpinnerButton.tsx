/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/ui/SpinnerButton.tsx
"use client";
export function SpinnerButton({ loading, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow
        ${loading ? "opacity-80 cursor-wait" : "hover:opacity-90"}
        ${rest.className ?? ""}`}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
