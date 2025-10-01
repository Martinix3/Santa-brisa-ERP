
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
  
    return (
      <nav
        className="bg-card border-b border-border"
        aria-label="Secciones de Almacén"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
  
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "py-3 border-b-2 text-sm font-medium transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/10 rounded",
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
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
      <ModuleHeader title="Almacén" icon={Warehouse} />

      <WarehouseNav />

      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
