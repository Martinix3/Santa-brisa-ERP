
"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ClipboardCheck } from 'lucide-react';
import { SB_COLORS } from '@/domain/ssot';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function QualityNav() {
    const pathname = usePathname() ?? '';
    const navItems = [
        { href: '/quality/dashboard', label: 'Dashboard' },
        { href: '/quality/release', label: 'Revisión de Lotes' },
        { href: '/quality/traceability', label: 'Trazabilidad' },
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
                                    ? 'border-sb-verde-mar text-sb-verde-mar'
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


export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ModuleHeader title="Control de Calidad" icon={ClipboardCheck} />
      <QualityNav />
      <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 px-4">
            {children}
          </div>
      </div>
    </>
  );
}
