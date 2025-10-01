
"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Factory } from 'lucide-react';
import { SB_COLORS } from '@/domain/ssot';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function ProductionNav() {
    const pathname = usePathname() ?? '';
    const navItems = [
        { href: '/production/dashboard', label: 'Dashboard' },
        { href: '/production/bom', label: 'Recetas (BOM)' },
        { href: '/production/execution', label: 'Ejecución' },
        { href: '/production/traceability', label: 'Trazabilidad' },
    ];

    return (
        <div className="bg-background border-b border-border">
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

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-white">
       <ModuleHeader title="Producción" icon={Factory} />
      <ProductionNav />
      <div className="flex-grow bg-secondary">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
      </div>
    </div>
  );
}
