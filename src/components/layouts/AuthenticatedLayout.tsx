"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, Calendar, Contact, BarChart3, Users, ShoppingCart, Megaphone,
  Zap, Star, Tags, Factory, BookOpen, Cpu, ClipboardCheck, CheckCircle,
  Waypoints, Truck, LineChart, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal,
  User, BadgeCheck, UploadCloud, PlugZap, Sheet, DatabaseZap, DatabaseBackup,
  TestTube2, LogOut, PanelLeftClose, PanelRightClose
} from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { Avatar } from "@/components/ui/Avatar";
import QuickLogOverlay from "@/features/quicklog/QuickLogOverlay";

/* ──────────────────────────────────────────────────────────────
   1) Tokens corporativos por módulo (usa tus variables HSL)
   ────────────────────────────────────────────────────────────── */
const MODULE_ACCENTS: Record<string, string> = {
  personal: "var(--sb-accent-personal)",
  sales: "var(--sb-accent-ventas)",
  marketing: "var(--sb-accent-marketing)",
  production: "var(--sb-accent-produc)",
  quality: "var(--sb-accent-calidad)",
  warehouse: "var(--sb-accent-logistica)",
  finance: "var(--sb-sun-strong)",
  admin: "var(--sb-accent-admin)",
};
const hsl = (cssVar: string, alpha?: number) =>
  alpha == null ? `hsl(${cssVar})` : `hsl(${cssVar} / ${alpha})`;

/* ──────────────────────────────────────────────────────────────
   2) Modelo de navegación (iconos SOLO para el rail)
   ────────────────────────────────────────────────────────────── */
type NavItem = { href: string; label: string; icon?: React.ElementType };
type NavSection = { title: string; module: keyof typeof MODULE_ACCENTS; items: NavItem[]; icon: React.ElementType };

const navSections: NavSection[] = [
  {
    title: "Personal",
    module: "personal",
    icon: Home,
    items: [
      { href: "/dashboard-personal", label: "Dashboard" },
      { href: "/agenda", label: "Agenda" },
      { href: "/contacts", label: "Contactos" },
    ],
  },
  {
    title: "Ventas",
    module: "sales",
    icon: BarChart3,
    items: [
      { href: "/dashboard-ventas", label: "Dashboard de Ventas" },
      { href: "/accounts", label: "Cuentas" },
      { href: "/orders", label: "Pedidos" },
    ],
  },
  {
    title: "Marketing",
    module: "marketing",
    icon: Megaphone,
    items: [
      { href: "/marketing/dashboard", label: "Dashboard" },
      { href: "/marketing/events", label: "Eventos" },
      { href: "/marketing/online", label: "Ads" },
      { href: "/marketing/influencers", label: "Influencers" },
      { href: "/marketing/pos-tactics", label: "Tácticas POS" },
      { href: "/marketing/pos-catalog", label: "Catálogo Tácticas" },
    ],
  },
  {
    title: "Producción",
    module: "production",
    icon: Factory,
    items: [
      { href: "/production/dashboard", label: "Dashboard" },
      { href: "/production/bom", label: "BOMs" },
      { href: "/production/execution", label: "Elaboración/Envasado" },
    ],
  },
  {
    title: "Calidad",
    module: "quality",
    icon: ClipboardCheck,
    items: [
      { href: "/quality/dashboard", label: "Dashboard QC" },
      { href: "/quality/release", label: "Liberación de Lotes" },
      { href: "/quality/traceability", label: "Trazabilidad" },
    ],
  },
  {
    title: "Logística",
    module: "warehouse",
    icon: Truck,
    items: [
      { href: "/warehouse/dashboard", label: "Dashboard" },
      { href: "/warehouse/logistics", label: "Envíos" },
      { href: "/warehouse/inventory", label: "Inventario" },
    ],
  },
  {
    title: "Financiera",
    module: "finance",
    icon: LineChart,
    items: [
      { href: "/cashflow/dashboard", label: "Dashboard" },
      { href: "/cashflow/payments", label: "Pagos" },
      { href: "/cashflow/collections", label: "Cobros" },
    ],
  },
  {
    title: "Admin",
    module: "admin",
    icon: SlidersHorizontal,
    items: [
      { href: "/admin/kpi-settings", label: "Ajustes de KPIs" },
      { href: "/users", label: "Usuarios" },
      { href: "/admin/sku-management", label: "SKUs" },
      { href: "/admin/schema-audit", label: "Schema Audit" },
      { href: "/admin/data-import", label: "Importar Datos" },
      { href: "/admin/integrations", label: "Integraciones" },
      { href: "/tools/ssot-accounts-editor", label: "Editor de Datos" },
      { href: "/dev/db-console", label: "Consola DB" },
      { href: "/dev/ssot-tests", label: "Tests de Integridad" },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────
   3) Estado / persistencia de UI
   ────────────────────────────────────────────────────────────── */
const LS_COLLAPSED = "sb.nav.collapsed";
const LS_SECTION = "sb.nav.currentSection"; // qué módulo está abierto

/* ──────────────────────────────────────────────────────────────
   4) Componentes de navegación (Rail + Panel)
   ────────────────────────────────────────────────────────────── */

// Rail estrecho: solo iconos, sirve para escamotear/mostrar el panel
function ModuleRail({
  sections,
  current,
  onPick,
  collapsed,
  setCollapsed,
}: {
  sections: NavSection[];
  current: string | null;
  onPick: (module: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside className="h-full w-16 border-r border-sb-neutral-200 bg-white flex flex-col items-center py-3">
      <Image
        src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726"
        alt="Santa Brisa"
        width={36}
        height={36}
        className="mb-4 opacity-90"
        priority
      />
      <nav className="flex-1 w-full flex flex-col items-center gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = current === s.module;
          return (
            <button
              key={s.module}
              onClick={() => onPick(s.module)}
              className="w-11 h-11 rounded-lg flex items-center justify-center transition-colors"
              title={s.title}
              style={{
                color: isActive ? hsl(MODULE_ACCENTS[s.module]) : "hsl(var(--sb-neutral-600))",
                background: isActive ? hsl(MODULE_ACCENTS[s.module], 0.12) : "transparent",
                border: isActive ? `1px solid ${hsl(MODULE_ACCENTS[s.module], 0.35)}` : "1px solid transparent",
              }}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </nav>
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        className="w-11 h-11 mb-1 rounded-lg flex items-center justify-center text-sb-neutral-600 hover:bg-sb-neutral-50"
      >
        {collapsed ? <PanelRightClose size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </aside>
  );
}

// Panel expandido: SOLO TEXTO (sin iconos) con acento por módulo
function SidePanel({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
}) {
  const accent = MODULE_ACCENTS[section.module];
  return (
    <aside
      className="w-72 border-r border-sb-neutral-200 bg-white flex flex-col"
      style={{ boxShadow: `inset 0 1px 0 0 rgba(0,0,0,0), 0 0 0 0 ${hsl(accent, 0)}` }}
    >
      <div className="px-4 pt-4 pb-3">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: hsl(accent) }}
        >
          {section.title}
        </h2>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {section.items.map((it) => {
          const active =
            it.href === "/"
              ? pathname === "/"
              : pathname.startsWith(it.href) && it.href !== "/";
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              className="block px-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                color: active ? hsl(accent) : "hsl(var(--sb-neutral-800))",
                background: active ? hsl(accent, 0.10) : "transparent",
                border: active ? `1px solid ${hsl(accent, 0.28)}` : "1px solid transparent",
              }}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────
   5) Layout principal
   ────────────────────────────────────────────────────────────── */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { data, currentUser, logout, isPersistenceEnabled, togglePersistence, setCurrentUserById } = useData();

  // rail/panel
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_COLLAPSED) === "1";
  });
  const [currentModule, setCurrentModule] = useState<string>(() => {
    if (typeof window === "undefined") return "personal";
    return localStorage.getItem(LS_SECTION) || "personal";
  });

  // deducir módulo activo por URL
  useEffect(() => {
    const hit = navSections.find((sec) =>
      sec.items.some((i) => pathname.startsWith(i.href) && i.href !== "/")
    );
    if (hit) {
      setCurrentModule(hit.module);
      if (typeof window !== "undefined") localStorage.setItem(LS_SECTION, hit.module);
    }
  }, [pathname]);

  // persistencia colapso
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0");
  }, [collapsed]);

  const activeSection = useMemo(
    () => navSections.find((s) => s.module === currentModule) || navSections[0],
    [currentModule]
  );

  const isPrivilegedUser =
    currentUser?.role?.toLowerCase() === "admin" || currentUser?.role?.toLowerCase() === "owner";

  // estilos de botón de persistencia
  const PersistenceIcon = isPersistenceEnabled ? DatabaseZap : DatabaseBackup;
  const persistenceStyles = isPersistenceEnabled
    ? "text-green-700 bg-green-100 hover:bg-green-200 border-green-200"
    : "text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-200";
  const persistenceTooltip = isPersistenceEnabled
    ? "Persistencia con DB activada. Los cambios se guardarán."
    : "Persistencia con DB desactivada. Los cambios son locales y se perderán.";

  return (
    <div className="h-screen flex bg-white">
      {/* 0) Oculta top-nav duplicados de páginas (si existiesen) */}
      <style jsx global>{`
        .warehouse-topnav,
        .module-topnav,
        .page-top-tabs {
          display: none !important;
        }
      `}</style>

      {/* 1) Rail de módulos (iconos) */}
      <ModuleRail
        sections={navSections.filter((s) => (s.title === "Admin" ? isPrivilegedUser : true))}
        current={currentModule}
        onPick={(m) => {
          setCurrentModule(m);
          if (typeof window !== "undefined") localStorage.setItem(LS_SECTION, m);
        }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* 2) Panel lateral expandible (texto sin iconos) */}
      {!collapsed && (
        <SidePanel
          section={
            (activeSection.title === "Admin" && !isPrivilegedUser
              ? navSections[0]
              : activeSection) as NavSection
          }
          pathname={pathname}
        />
      )}

      {/* 3) Contenido principal */}
      <main className="flex-1 min-w-0 grid grid-rows-[auto_1fr]">
        {/* Header superior minimal */}
        <header className="h-14 border-b border-sb-neutral-200 bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1
              className="text-lg font-semibold"
              style={{ color: hsl(MODULE_ACCENTS[activeSection.module]) }}
            >
              {activeSection.title}
            </h1>
            {/* Chip tenue con acento */}
            <span
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                color: hsl(MODULE_ACCENTS[activeSection.module]),
                background: hsl(MODULE_ACCENTS[activeSection.module], 0.10),
                border: `1px solid ${hsl(MODULE_ACCENTS[activeSection.module], 0.28)}`,
              }}
            >
              {pathname}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch persistencia */}
            <button
              onClick={togglePersistence}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${persistenceStyles}`}
              title={persistenceTooltip}
            >
              <PersistenceIcon className="h-4 w-4" />
              <span>{isPersistenceEnabled ? "DB ON" : "DB OFF"}</span>
            </button>

            {/* Usuario */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-sb-neutral-50">
              <Avatar name={currentUser?.name} size="md" className="sb-icon" />
              <div className="hidden md:block leading-tight">
                <div className="text-sm font-medium">{currentUser?.name}</div>
                <div className="text-xs text-sb-neutral-500">{currentUser?.email}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-2 py-1.5 rounded-md text-sb-neutral-600 hover:bg-sb-neutral-100"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="overflow-y-auto">{children}</div>

        {/* Overlay de quick log */}
        <QuickLogOverlay />
      </main>
    </div>
  );
}
