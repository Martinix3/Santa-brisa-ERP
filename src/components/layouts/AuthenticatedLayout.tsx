
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
} from 'lucide-react';
import { SB_COLORS, hexToRgba } from '@/components/ui/ui-primitives';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useData } from '@/lib/dataprovider';


const navSections = [
    {
        title: 'Personal',
        module: 'sales',
        items: [
            { href: '/dashboard-personal', label: 'Dashboard', icon: BarChart3 },
            { href: '/agenda', label: 'Agenda', icon: Calendar },
        ]
    },
    {
        title: 'Ventas',
        module: 'sales',
        items: [
            { href: '/dashboard-ventas', label: 'Dashboard de Ventas', icon: BarChart3 },
            { href: '/accounts', label: 'Cuentas', icon: Users },
            { href: '/dev/data-viewer?collection=distributors', label: 'Distribuidores', icon: Briefcase },
            { href: '/orders', label: 'Pedidos', icon: ShoppingCart },
        ]
    },
    {
        title: 'Marketing',
        module: 'marketing',
        items: [
            { href: '/marketing/dashboard', label: 'Dashboard', icon: Megaphone },
            { href: '/marketing/events', label: 'Eventos', icon: Calendar },
            { href: '/marketing/online', label: 'Adds', icon: Zap },
            { href: '/marketing/influencers/dashboard', label: 'Influencers', icon: Contact },
        ]
    },
    {
        title: 'Producción',
        module: 'production',
        items: [
            { href: '/production/dashboard', label: 'Dashboard', icon: Factory },
            { href: '/production/bom', label: 'BOMs', icon: BookOpen },
            { href: '/production/execution', label: 'Elaboración/Envasado', icon: Cpu },
            { href: '/production/traceability', label: 'Trazabilidad', icon: Waypoints },
            { href: '/dev/qc-params', label: 'Calidad / Parámetros', icon: ClipboardCheck },
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
            { href: '/dev/data-viewer', label: 'Data Viewer', icon: Database },
            { href: '/dev/db-console', label: 'Consola de DB', icon: DatabaseZap },
            { href: '/dev/ssot-tests', label: 'Tests de Integridad', icon: TestTube2 },
            { href: '/dev/integrations-panel', label: 'Integraciones', icon: Zap },
        ]
    }
];

function NavLink({ 
    href, 
    label, 
    icon: Icon, 
    isCollapsed,
    moduleColor
}: { 
    href: string; 
    label: string; 
    icon: React.ElementType, 
    isCollapsed: boolean,
    moduleColor: string,
}) {
    const pathname = usePathname() ?? '/';
    const isActive = href === '/' ? pathname === href : pathname.startsWith(href) && href !== '/';

    const activeStyle = {
        backgroundColor: hexToRgba(moduleColor, 0.08),
        color: moduleColor,
    };
    const inactiveStyle = {
        color: 'hsl(var(--sb-neutral-700))',
    };

    return (
        <Link 
            href={href} 
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isCollapsed ? 'justify-center' : ''
            } ${isActive ? '' : 'hover:bg-sb-neutral-100 hover:text-sb-neutral-900'}`}
            style={isActive ? activeStyle : inactiveStyle}
            title={isCollapsed ? label : undefined}
        >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
        </Link>
    );
}

function NavSection({ 
    section, 
    isCollapsed,
    isExpanded,
    onToggle
}: { 
    section: typeof navSections[0], 
    isCollapsed: boolean,
    isExpanded: boolean,
    onToggle: () => void,
}) {
    const pathname = usePathname() ?? '/';
    const router = useRouter();
    const isSectionActive = section.items.some(item => pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/'));
    const colorKey = (section.module || 'primary') as keyof typeof SB_COLORS;
    const moduleColor = SB_COLORS[colorKey] || SB_COLORS.primary;
    const Icon = section.items[0].icon;

    const handleToggle = () => {
        onToggle();
    };

    if (section.items.length === 1 && !isCollapsed) {
        return <NavLink {...section.items[0]} isCollapsed={isCollapsed} moduleColor={moduleColor} />;
    }

    return (
        <div className="py-1">
            <button
                onClick={handleToggle}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                    isCollapsed ? 'justify-center' : ''
                } ${isSectionActive ? '' : 'text-sb-neutral-500 hover:bg-sb-neutral-100 hover:text-sb-neutral-900'}`}
                style={isSectionActive ? { color: moduleColor } : {}}
                title={isCollapsed ? section.title : undefined}
            >
                {!isCollapsed && <span className="uppercase tracking-wider text-xs">{section.title}</span>}
                {isCollapsed && <div className="p-1"><Icon className="h-5 w-5"/></div>}
                {!isCollapsed && (
                    <ChevronDown 
                        className={`h-4 w-4 transition-transform duration-200`}
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                )}
            </button>
            <AnimatePresence initial={false}>
                {isExpanded && !isCollapsed && (
                     <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="pl-3 mt-1 space-y-1 overflow-hidden"
                     >
                        {section.items.map(item => (
                            <NavLink key={item.href} {...item} isCollapsed={isCollapsed} moduleColor={moduleColor} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const pathname = usePathname() ?? '/';
  const { data, currentUser, isLoading, logout, isPersistenceEnabled, togglePersistence, setCurrentUserById } = useData();

  useEffect(() => {
    const activeSection = navSections.find(section => section.items.some(item => pathname.startsWith(item.href) && item.href !== '/'));
    if(pathname === '/') {
        setExpandedSections(prev => ({...prev, 'Personal':true}));
        return;
    }
    if (activeSection) {
        setExpandedSections(prev => ({ ...prev, [activeSection.title]: true }));
    }
  }, [pathname]);

  const handleLogout = () => {
    logout();
  };
  
  if (isLoading || !data) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-white">
            <p>Cargando...</p>
        </div>
    )
  }

  const PersistenceIcon = isPersistenceEnabled ? DatabaseZap : DatabaseBackup;
  const persistenceStyles = isPersistenceEnabled
    ? 'text-green-700 bg-green-100 hover:bg-green-200 border-green-200'
    : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-200';
  const persistenceTooltip = isPersistenceEnabled
    ? 'Persistencia con DB activada. Los cambios se guardarán.'
    : 'Persistencia con DB desactivada. Los cambios son locales y se perderán.';

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
                    className={`transition-all duration-300 ease-in-out h-8`} 
                />
            </div>
            <div className="space-y-1 flex-grow overflow-y-auto">
                {navSections.map(section => (
                    <NavSection 
                        key={section.title} 
                        section={section}
                        isCollapsed={isSidebarCollapsed}
                        isExpanded={!!expandedSections[section.title]}
                        onToggle={() => setExpandedSections(prev => ({...prev, [section.title]: !prev[section.title]}))}
                    />
                ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-sb-neutral-200 relative">
                <div 
                    className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer ${isSidebarCollapsed ? '' : 'hover:bg-sb-neutral-50'}`}
                    onClick={() => !isSidebarCollapsed && setIsUserMenuOpen(!isUserMenuOpen)}
                >
                    <div className="h-8 w-8 rounded-full bg-sb-sun flex-shrink-0 flex items-center justify-center font-bold text-sb-neutral-800">
                        {currentUser?.name.charAt(0)}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
                            <p className="text-xs text-sb-neutral-500 truncate">{currentUser?.email}</p>
                        </div>
                    )}
                    {!isSidebarCollapsed && (
                        isUserMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />
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
                            {data.users.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        setCurrentUserById(user.id);
                                        setIsUserMenuOpen(false);
                                    }}
                                    className={`w-full text-left text-sm px-2 py-1.5 rounded-md flex items-center gap-2 ${currentUser?.id === user.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-zinc-100'}`}
                                >
                                    <User size={14} /> {user.name}
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
                    <PersistenceIcon className="h-5 w-5" />
                    {!isSidebarCollapsed && <span>{isPersistenceEnabled ? 'DB ON' : 'DB OFF'}</span>}
                </button>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 px-3 py-2 mt-2 rounded-md text-sm font-medium text-sb-neutral-600 hover:bg-sb-neutral-100"
                    title="Cerrar sesión (deshabilitado)"
                >
                    <LogOut className="h-5 w-5" />
                    {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
                </button>

                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="w-full flex items-center justify-center gap-3 px-3 py-2 mt-2 rounded-md text-sm font-medium text-sb-neutral-600 hover:bg-sb-neutral-100"
                    title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                >
                    {isSidebarCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </button>
            </div>
          </nav>
        </aside>
        <main className="overflow-y-auto flex flex-col">{children}</main>
      </div>
    </div>
  );
}
