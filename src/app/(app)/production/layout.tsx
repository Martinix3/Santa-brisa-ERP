
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

    const accentColor = 'hsl(var(--sb-accent-produc))';

    return (
        <div className="bg-white border-b border-zinc-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex gap-6">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'py-3 border-b-2 text-sm font-medium transition-colors',
                                pathname.startsWith(item.href)
                                    ? 'text-zinc-900'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                            )}
                             style={{
                                borderColor: pathname.startsWith(item.href) ? accentColor : 'transparent',
                                color: pathname.startsWith(item.href) ? `hsl(var(--sb-accent-produc))` : ''
                            }}
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
  const accentColor = 'hsl(var(--sb-accent-produc))';
  return (
    <div className="h-full flex flex-col">
       <ModuleHeader 
        title="Producción" 
        icon={()=>(<div className="p-2 rounded-lg" style={{backgroundColor: accentColor+'33', color: accentColor}}><Factory size={20}/></div>)} 
       />
      <ProductionNav />
      <div className="flex-grow bg-zinc-50">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
      </div>
    </div>
  );
}
