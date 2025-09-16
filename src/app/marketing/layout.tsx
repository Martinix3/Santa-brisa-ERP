

"use client";
import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Megaphone } from 'lucide-react';
import { SB_COLORS } from '@/components/ui/ui-primitives';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function MarketingNav() {
    const pathname = usePathname();
    const navItems = [
        { href: '/marketing/dashboard', label: 'Dashboard' },
        { href: '/marketing/events', label: 'Eventos' },
        { href: '/marketing/online', label: 'Campañas Online' },
        { href: '/marketing/influencers/dashboard', label: 'Influencers' },
    ];

    return (
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
    );
}


export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout>
       <ModuleHeader title="Marketing" icon={Megaphone} />
       <div className="bg-white border-b border-sb-neutral-200">
            <MarketingNav />
       </div>
      <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 px-4">
            {children}
          </div>
      </div>
    </AuthenticatedLayout>
  );
}
