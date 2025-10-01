
"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Megaphone } from 'lucide-react';
import { SB_COLORS } from '@/domain/ssot';

const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function MarketingNav() {
    const pathname = usePathname() ?? '';
    const navItems = [
        { href: '/marketing/dashboard', label: 'Dashboard' },
        { href: '/marketing/events', label: 'Eventos' },
        { href: '/marketing/online', label: 'Campañas Online' },
        { href: '/marketing/influencers/dashboard', label: 'Influencers' },
        { href: '/marketing/pos-tactics', label: 'Tácticas POS' },
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


export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
       <ModuleHeader title="Marketing" icon={Megaphone} />
       <div className="bg-card border-b border-border">
            <MarketingNav />
       </div>
      <div className="flex-grow bg-secondary">
          <div className="max-w-7xl mx-auto py-6 px-4">
            {children}
          </div>
      </div>
    </>
  );
}
