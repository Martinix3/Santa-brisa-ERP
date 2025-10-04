// src/app/(app)/sales/layout.tsx
"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { BarChart3 } from 'lucide-react';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function SalesNav() {
    const pathname = usePathname() ?? '';
    const navItems = [
        { href: '/sales/dashboard', label: 'Pipeline' },
        { href: '/accounts', label: 'Cuentas' },
        { href: '/orders', label: 'Pedidos' },
    ];

    return (
        <div className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex gap-6">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'py-3 border-b-2 text-sm font-medium transition-colors',
                                pathname.startsWith(item.href)
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-secondary">
       <ModuleHeader title="Ventas" icon={BarChart3} />
       <SalesNav />
      <div className="flex-grow min-h-0">
          <div className="max-w-screen-2xl mx-auto h-full">
            {children}
          </div>
      </div>
    </div>
  );
}
