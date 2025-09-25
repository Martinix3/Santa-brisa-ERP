

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
    Users, 
    Calendar, 
    ShoppingCart, 
    BarChart3, 
    Megaphone, 
    Cpu, 
    Warehouse, 
    User, 
    FileCog, 
    TestTube2,
    Factory,
    Truck,
    BookOpen,
    Waypoints,
    Zap,
    FlaskConical,
    LineChart,
    ArrowDownCircle,
    ArrowUpCircle,
    PanelLeftClose,
    PanelRightClose,
    ClipboardCheck,
    CheckCircle,
    Tags,
    ChevronDown,
    Contact,
    Briefcase,
    SlidersHorizontal,
    Database,
    Map as MapIcon,
    LogOut,
    Home,
    DatabaseZap,
    DatabaseBackup,
    ChevronUp,
    Sheet,
    Star,
    BadgeCheck,
    UploadCloud,
    PlugZap
} from 'lucide-react';
import { SB_COLORS, SB_THEME } from '@/domain/ssot';
import { hexToRgba } from '@/components/ui/ui-primitives';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useData } from '@/lib/dataprovider';
import { Avatar } from '@/components/ui/Avatar';
import QuickLogOverlay from '@/features/quicklog/QuickLogOverlay';

// === Helpers de acento y persistencia ===
const MODULE_ACCENTS: Record<string, string> = {
    personal: 'var(--sb-accent-personal)',
    sales: 'var(--sb-accent-ventas)',
    marketing: 'var(--sb-accent-marketing)',
    production: 'var(--sb-accent-produc)',
    quality: 'var(--sb-accent-calidad)',
    warehouse: 'var(--sb-accent-logistica)',
    finance: 'var(--sb-accent-finance)',
    admin: 'var(--sb-accent-admin)',
};
  
const hsl = (cssVar: string, alpha?: number) =>
  alpha == null ? `hsl(${cssVar})` : `hsl(${cssVar} / ${alpha})`;
  
  // Persistencia simple en localStorage (colapso + secciones abiertas)
  const LS_COLLAPSED = 'sb.sidebar.collapsed';
  const LS_EXPANDED = 'sb.sidebar.expandedSections';

const navSections = [
    {
        title: 'Personal',
        module: 'personal',
        items: [
            { href: '/dashboard-personal', label: 'Dashboard', icon: Home },
            { href: '/agenda', label: 'Agenda', icon: Calendar },
            { href: '/contacts', label: 'Contactos', icon: Contact },
        ]
    },
    {
        title: 'Ventas',
        module: 'sales',
        items: [
            { href: '/dashboard-ventas', label: 'Dashboard de Ventas', icon: BarChart3 },
            { href: '/accounts', label: 'Cuentas', icon: Users },
            { href: '/orders', label: 'Pedidos', icon: ShoppingCart },
        ]
    },
    {
        title: 'Marketing',
        module: 'marketing',
        items: [
            { href: '/marketing/dashboard', label: 'Dashboard', icon: Megaphone },
            { href: '/marketing/events', label: 'Eventos', icon: Calendar },
            { href: '/marketing/online', label: 'Ads', icon: Zap },
            { href: '/marketing/influencers', label: 'Influencers', icon: Contact },
            { href: '/marketing/pos-tactics', label: 'Tácticas POS', icon: Star },
        ]
    },
    {
        title: 'Producción',
        module: 'production',
        items: [
            { href: '/production/dashboard', label: 'Dashboard', icon: Factory },
            { href: '/production/bom', label: 'BOMs', icon: BookOpen },
            { href: '/production/execution', label: 'Elaboración/Envasado', icon: Cpu },
        ]
    },
    {
        title: 'Calidad',
        module: 'quality',
        items: [
            { href: '/quality/dashboard', label: 'Dashboard QC', icon: ClipboardCheck },
            { href: '/quality/release', label: 'Liberación de Lotes', icon: CheckCircle },
            { href: '/quality/traceability', label: 'Trazabilidad', icon: Waypoints },
        ]
    },
    {
        title: 'Logística',
        module: 'warehouse',
        items: [
            { href: '/warehouse/dashboard', label: 'Dashboard', icon: Truck },
            { href: '/warehouse/logistics', label: 'Envíos', icon: Zap },
            { href: '/warehouse/inventory', label: 'Inventario', icon: Warehouse },
        ]
    },
    {
        title: 'Financiera',
        module: 'finance',
        items: [
            { href: '/cashflow/dashboard', label: 'Dashboard', icon: LineChart },
            { href: '/cashflow/payments', label: 'Pagos', icon: ArrowUpCircle },
            { href: '/cashflow/collections', label: 'Cobros', icon: ArrowDownCircle },
        ]
    },
    {
        title: 'Admin',
        module: 'admin',
        items: [
            { href: '/admin/kpi-settings', label: 'Ajustes de KPIs', icon: SlidersHorizontal },
            { href: '/users', label: 'Usuarios', icon: User },
            { href: '/admin/sku-management', label: 'SKUs', icon: Tags },
            { href: '/admin/schema-audit', label: 'Schema Audit', icon: BadgeCheck },
            { href: '/admin/data-import', label: 'Importar Datos', icon: UploadCloud },
            { href: '/admin/integrations', label: 'Integraciones', icon: PlugZap },
            { href: '/tools/ssot-accounts-editor', label: 'Editor de Datos', icon: Sheet },
            { href: '/dev/db-console', label: 'Consola DB', icon: DatabaseZap },
            { href: '/dev/ssot-tests', label: 'Tests de Integridad', icon: TestTube2 },
        ]
    }
];

function NavLink({
  href, label, isCollapsed, moduleColor,
}: {
  href: string; label: string; isCollapsed: boolean; moduleColor: string;
}) {
  const pathname = usePathname() ?? '/';
  const isActive = href === '/' ? pathname === href : pathname.startsWith(href) && href !== '/';

  const base =
    'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-neutral-200))] border border-transparent';
  const hover = isCollapsed ? '' : ' hover:bg-[hsl(var(--sb-neutral-100))]';

  return (
    <Link
      href={href}
      className={`${base}${hover} ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'sb-nav-active' : ''}`}
      style={isActive ? { borderLeftColor: hsl(moduleColor) } : undefined}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? label : undefined}
    >
      <span className={`flex-1 truncate ${isCollapsed ? 'text-center' : 'text-neutral-800'}`}>{label}</span>
    </Link>
  );
}

  
function NavSection({
  section, isCollapsed, isExpanded, onToggle,
}: {
  section: typeof navSections[number]; isCollapsed: boolean; isExpanded: boolean; onToggle: () => void;
}) {
  const pathname = usePathname() ?? '/';
  const isSectionActive = section.items.some(
    (item) => pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/')
  );

  const accentVar = MODULE_ACCENTS[section.module] ?? 'var(--sb-accent-personal)';
  const dashboardItem = section.items[0];
  const DeptIcon = dashboardItem.icon;

  return (
    <div className="py-1">
      <div className="w-full flex items-center justify-between">
        <Link
          href={dashboardItem.href}
          className={`flex-grow flex items-center gap-3 px-3 py-2 rounded-md ${isCollapsed ? 'justify-center' : ''} ${isSectionActive ? '' : 'text-neutral-500 hover:text-neutral-900'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-neutral-200))]`}
          title={isCollapsed ? section.title : undefined}
        >
          <span
            className="sb-chip-solid"
            style={{ backgroundColor: hsl(accentVar) }}
            aria-hidden
          >
            <DeptIcon className="w-4 h-4" />
          </span>
          {!isCollapsed && (
            <span className="uppercase tracking-wider text-xs font-semibold text-neutral-700">
              {section.title}
            </span>
          )}
        </Link>

        {!isCollapsed && (
          <button
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={`dept-${section.title}`}
            className="p-1 rounded-md text-neutral-600 hover:bg-[hsl(var(--sb-neutral-100))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-neutral-200))]"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && !isCollapsed && (
          <motion.div
            key={`content-${section.title}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            id={`dept-${section.title}`}
            className="pl-3 mt-1 space-y-1 overflow-hidden"
          >
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                isCollapsed={isCollapsed}
                moduleColor={accentVar}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

  export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem(LS_COLLAPSED) === '1';
    });
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
      if (typeof window === 'undefined') return {};
      try {
        const raw = localStorage.getItem(LS_EXPANDED);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    });
  
    const pathname = usePathname() ?? '/';
    const { data, currentUser, authReady, logout, isPersistenceEnabled, togglePersistence, setCurrentUserById } = useData();
  
    // Abrir sección del path actual
    useEffect(() => {
      const activeSection = navSections.find((section) =>
        section.items.some((item) => pathname.startsWith(item.href) && item.href !== '/')
      );
      if (pathname === '/') {
        setExpandedSections((prev) => ({ ...prev, Personal: true }));
        return;
      }
      if (activeSection) {
        setExpandedSections((prev) => {
          const next = { ...prev, [activeSection.title]: true };
          localStorage.setItem(LS_EXPANDED, JSON.stringify(next));
          return next;
        });
      }
    }, [pathname]);
  
    // Persistir colapso
    useEffect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_COLLAPSED, isSidebarCollapsed ? '1' : '0');
      }
    }, [isSidebarCollapsed]);
  
    // Toggle secciones con persistencia
    const toggleSection = (title: string) =>
      setExpandedSections((prev) => {
        const next = { ...prev, [title]: !prev[title] };
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_EXPANDED, JSON.stringify(next));
        }
        return next;
      });
  
    const handleLogout = () => logout();

  const PersistenceIcon = isPersistenceEnabled ? DatabaseZap : DatabaseBackup;
  const persistenceStyles = isPersistenceEnabled
    ? 'text-green-700 bg-green-100 hover:bg-green-200 border-green-200'
    : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-200';
  const persistenceTooltip = isPersistenceEnabled
    ? 'Persistencia con DB activada. Los cambios se guardarán.'
    : 'Persistencia con DB desactivada. Los cambios son locales y se perderán.';

  const isPrivilegedUser = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'owner';

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className={`flex-grow grid grid-cols-1 md:grid-cols-[auto_1fr] min-h-0 transition-all duration-300 ease-in-out`}>
        <aside className={`bg-white border-r border-sb-neutral-200 transition-all duration-300 ease-in-out flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <nav className="h-full flex flex-col p-3">
            <div className="p-3">
                <Image 
                    src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726" 
                    alt="Santa Brisa"
                    width={100}
                    height={32}
                    priority
                    className={`transition-all duration-300 ease-in-out h-8`} 
                />
            </div>
            <div className="space-y-1 flex-grow overflow-y-auto">
                {navSections.map(section => {
                    if(section.title === 'Admin' && !isPrivilegedUser) return null;
                    return (
                        <NavSection 
                            key={section.title} 
                            section={section}
                            isCollapsed={isSidebarCollapsed}
                            isExpanded={!!expandedSections[section.title]}
                            onToggle={() => toggleSection(section.title)}
                        />
                    )
                })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-sb-neutral-200 relative">
                <div 
                    className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer ${isSidebarCollapsed ? '' : 'hover:bg-sb-neutral-50'}`}
                    onClick={() => !isSidebarCollapsed && setIsUserMenuOpen(!isUserMenuOpen)}
                >
                    <Avatar name={currentUser?.name} size="lg" className="sb-icon" />

                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
                            <p className="text-xs text-sb-neutral-500 truncate">{currentUser?.email}</p>
                        </div>
                    )}
                    {!isSidebarCollapsed && (
                        isUserMenuOpen ? <ChevronUp size={16} className="sb-icon" /> : <ChevronDown size={16} className="sb-icon" />
                    )}
                </div>

                <AnimatePresence>
                {isUserMenuOpen && !isSidebarCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute bottom-full mb-2 w-full bg-white border rounded-lg shadow-lg"
                    >
                        <div className="p-2">
                             <p className="text-xs font-semibold text-zinc-500 px-2 pt-1 pb-2">Cambiar de usuario</p>
                            {data && data.users.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        setCurrentUserById(user.id);
                                        setIsUserMenuOpen(false);
                                    }}
                                    className={`w-full text-left text-sm px-2 py-1.5 rounded-md flex items-center gap-2 ${currentUser?.id === user.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-zinc-100'}`}
                                >
                                    <User size={14} className="sb-icon" /> {user.name}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>

                <button
                    onClick={togglePersistence}
                    className={`w-full flex items-center justify-center gap-3 px-3 py-2 mt-2 rounded-md text-sm font-semibold border transition-colors ${persistenceStyles}`}
                    title={persistenceTooltip}
                >
                    <PersistenceIcon className="sb-icon h-5 w-5" />
                    {!isSidebarCollapsed && <span>{isPersistenceEnabled ? 'DB ON' : 'DB OFF'}</span>}
                </button>

                <button
                    onClick={handleLogout}
                    className="sb-btn-primary w-full flex items-center justify-center gap-3 px-3 py-2 mt-2 rounded-md text-sm font-medium text-sb-neutral-600 hover:bg-sb-neutral-100"
                    title="Cerrar sesión"
                >
                    <LogOut className="h-5 w-5" />
                    {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
                </button>

                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="sb-btn-primary w-full flex items-center justify-center gap-3 px-3 py-2 mt-2 rounded-md text-sm font-medium text-sb-neutral-600 hover:bg-sb-neutral-100"
                    title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                >
                    {isSidebarCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </button>
            </div>
          </nav>
        </aside>
        <main className="overflow-y-auto flex flex-col">
            {children}
            <QuickLogOverlay />
        </main>
      </div>
    </div>
  );
}
