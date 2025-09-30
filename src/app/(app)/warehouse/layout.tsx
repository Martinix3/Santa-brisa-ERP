
"use client";
import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Warehouse } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const clsx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

function WarehouseNav() {
    const pathname = usePathname();
    const navItems = [
      { href: "/warehouse/dashboard", label: "Dashboard" },
      { href: "/warehouse/inventory", label: "Inventario" },
      { href: "/warehouse/goods-receipt", label: "Recepciones" },
      { href: "/warehouse/logistics", label: "Logística" },
    ];
  
    // Utilizamos el acento del módulo logística (CSS var)
    const ACCENT = "var(--sb-accent-logistica)";
  
    return (
      <nav
        className="bg-white border-b border-zinc-200"
        aria-label="Secciones de Almacén"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* scroll-x en móvil para que no se rompa */}
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
  
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "relative py-3 text-sm font-medium transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/10 rounded",
                    active
                      ? "text-[color:var(--sb-ink-900)]"
                      : "text-sb-neutral-500 hover:text-sb-neutral-700"
                  )}
                  style={
                    active
                      ? {
                          borderBottom: `2px solid ${ACCENT}`,
                          color: "color-mix(in oklab, var(--sb-accent-logistica) 65%, black)",
                        }
                      : { borderBottom: "2px solid transparent" }
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col">
      <div style={{ "--sb-accent-current": "var(--sb-accent-logistica)" } as React.CSSProperties}>
        <ModuleHeader title="Almacén" icon={Warehouse} />
      </div>

      <WarehouseNav />

      <div className="flex-grow bg-zinc-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
