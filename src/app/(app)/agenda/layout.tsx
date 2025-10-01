
"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Calendar } from 'lucide-react';
import { SB_COLORS, tokenToHsl } from '@/domain/ssot';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function AgendaNav() {
    const pathname = usePathname() ?? '';
    const navItems = [
        { href: '/agenda/calendar', label: 'Calendario' },
        { href: '/agenda/tasks', label: 'Tareas' },
    ];

    return (
        <div className="bg-secondary border-b border-sb-neutral-200">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
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

export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col">
      <ModuleHeader 
        title="Agenda" 
        icon={Calendar}
      />
      <AgendaNav />
      <div className="flex-grow min-h-0 bg-secondary">
          {children}
      </div>
    </div>
  );
}
