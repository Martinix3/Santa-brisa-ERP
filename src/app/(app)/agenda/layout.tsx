
"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Calendar } from 'lucide-react';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function AgendaNav() {
    const pathname = usePathname() ?? '';
    const navItems = [
        { href: '/agenda/calendar', label: 'Calendario' },
        { href: '/agenda/tasks', label: 'Tareas' },
    ];

    return (
        <div className="bg-white border-b border-sb-neutral-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex gap-6">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'py-3 border-b-2 text-sm font-medium transition-colors',
                                pathname.startsWith(item.href)
                                    ? 'border-sb-sun text-sb-cobre'
                                    : 'border-transparent text-sb-neutral-500 hover:text-sb-neutral-700 hover:border-sb-neutral-300'
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
    <>
      <ModuleHeader title="Agenda" icon={Calendar} />
      <AgendaNav />
      <div className="flex-grow bg-zinc-50/50">
        <div className="max-w-full mx-auto py-6 px-4">
          {children}
        </div>
      </div>
    </>
  );
}
