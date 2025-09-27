
"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ClipboardCheck } from 'lucide-react';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function QualityNav() {
    const pathname = usePathname() ?? '';
    const navItems = [
        { href: '/quality/dashboard', label: 'Dashboard' },
        { href: '/quality/release', label: 'Laboratorio (Liberación)' },
        { href: '/quality/autocontrol', label: 'Autocontrol' },
        { href: '/quality/parametros', label: 'Parámetros y Planes' },
    ];

    const accentColor = 'hsl(var(--sb-accent-calidad))';

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
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                            )}
                            style={{
                                borderColor: pathname.startsWith(item.href) ? accentColor : 'transparent',
                                color: pathname.startsWith(item.href) ? accentColor : ''
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

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  const accentColor = 'hsl(var(--sb-accent-calidad))';
  return (
    <div className="h-full flex flex-col">
       <ModuleHeader 
        title="Gestión de Calidad" 
        icon={()=>(<div className="p-2 rounded-lg" style={{backgroundColor: accentColor+'33', color: accentColor}}><ClipboardCheck size={20}/></div>)} 
       />
      <QualityNav />
      <div className="flex-grow bg-zinc-50">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
      </div>
    </div>
  );
}
