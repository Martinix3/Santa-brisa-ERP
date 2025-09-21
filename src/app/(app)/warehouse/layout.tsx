
"use client";
import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Warehouse } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function WarehouseNav() {
    const pathname = usePathname();
    const navItems = [
        { href: '/warehouse/dashboard', label: 'Dashboard' },
        { href: '/warehouse/inventory', label: 'Inventario' },
        { href: '/warehouse/logistics', label: 'Logística' },
    ];

    return (
        <nav className="bg-white border-b border-sb-neutral-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex gap-6">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'py-3 border-b-2 text-sm font-medium transition-colors',
                                pathname === item.href
                                    ? 'border-sb-verde-mar text-sb-verde-mar'
                                    : 'border-transparent text-sb-neutral-500 hover:text-sb-neutral-700 hover:border-sb-neutral-300'
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}


export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModuleHeader title="Almacén" icon={Warehouse} />
      <WarehouseNav />
      <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
      </div>
    </>
  );
}
