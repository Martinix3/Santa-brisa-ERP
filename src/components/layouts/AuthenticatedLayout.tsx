"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, BarChart3, Megaphone, Factory, ClipboardCheck, Truck,
  LineChart, SlidersHorizontal, LogOut, PanelRightClose, PanelLeftClose,
} from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { Avatar } from "@/components/ui/Avatar";
import QuickLogOverlay from "@/features/quicklog/QuickLogOverlay";

/* ──────────────────────────────────────────────────────────────
   1) Tokens corporativos por módulo (HSL variables)
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
   2) Modelo de navegación (iconos SOLO en el rail)
   ────────────────────────────────────────────────────────────── */
type NavItem = { href: string; label: string };
type NavSection = {
  title: string;
  module: keyof typeof MODULE_ACCENTS;
  icon: React.ElementType; // solo para el rail
  items: NavItem[];
};

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
   3) Persistencia de UI
   ────────────────────────────────────────────────────────────── */
const LS_PINNED = "sb.nav.pinnedModule"; // módulo fijado
const LS_COLLAPSED = "sb.nav.railCollapsed"; // rail ancho/estrecho (opcional)

/* ──────────────────────────────────────────────────────────────
   4) Rail con iconos (siempre visible)
   ────────────────────────────────────────────────────────────── */
function ModuleRail({
  sections,
  current,
  onHover,
  onLeave,
  onPick,
  collapsed,
  setCollapsed,
}: {
  sections: NavSection[];
  current: string | null;
  onHover: (module: string) => void;
  onLeave: () => void;
  onPick: (module: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside
      className={`h-full ${collapsed ? "w-12" : "w-16"} border-r border-sb-neutral-200 bg-white flex flex-col items-center py-3`}
      onMouseLeave={onLeave}
    >
      <Image
        src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726"
        alt="Santa Brisa"
        width={collapsed ? 24 : 36}
        height={collapsed ? 24 : 36}
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
              onMouseEnter={() => onHover(s.module)}
              onClick={() => onPick(s.module)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
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
        title={collapsed ? "Expandir rail" : "Colapsar rail"}
        className="w-10 h-10 mb-1 rounded-lg flex items-center justify-center text-sb-neutral-600 hover:bg-sb-neutral-50"
      >
        {collapsed ? <PanelRightClose size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────
   5) Flyout/Panel (texto, sin iconos). Puede fijarse 📌
   ────────────────────────────────────────────────────────────── */
function FlyoutPanel({
  section,
  pathname,
  pinned,
  onPinToggle,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  section: NavSection;
  pathname: string;
  pinned: boolean;
  onPinToggle: () => void;
  onNavigate?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const accent = MODULE_ACCENTS[section.module];

  return (
    <aside
      className={`h-full w-72 border-r border-sb-neutral-200 bg-white flex flex-col shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${pinned ? "" : "pointer-events-auto"}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: hsl(accent) }}
        >
          {section.title}
        </h2>
        <button
          onClick={onPinToggle}
          className="text-xs px-2 py-1 rounded border hover:bg-zinc-50"
          style={{
            color: hsl(accent),
            borderColor: hsl(accent, 0.35),
            background: pinned ? hsl(accent, 0.08) : "transparent",
          }}
          title={pinned ? "Desfijar menú" : "Fijar menú"}
        >
          {pinned ? "Desfijar" : "Fijar"}
        </button>
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
   6) Layout principal
   ────────────────────────────────────────────────────────────── */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { data, currentUser, logout, isPersistenceEnabled, togglePersistence, setCurrentUserById } = useData();

  // Rail y flyout
  const [railCollapsed, setRailCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_COLLAPSED) === "1";
  });
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [pinnedModule, setPinnedModule] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_PINNED);
  });

  // Módulo activo según ruta (para colorear rail)
  const activeByPath = useMemo(() => {
    const hit = navSections.find((sec) =>
      sec.items.some((i) => pathname.startsWith(i.href) && i.href !== "/")
    );
    return hit?.module ?? "personal";
  }, [pathname]);

  // Persistencias
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_COLLAPSED, railCollapsed ? "1" : "0");
  }, [railCollapsed]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (pinnedModule) localStorage.setItem(LS_PINNED, pinnedModule);
      else localStorage.removeItem(LS_PINNED);
    }
  }, [pinnedModule]);

  // Flyout visible si hay hovered o está fijado
  const openModule = pinnedModule || hoveredModule;
  const openSection =
    (openModule && navSections.find((s) => s.module === openModule)) || null;

  const isPrivilegedUser =
    currentUser?.role?.toLowerCase() === "admin" || currentUser?.role?.toLowerCase() === "owner";

  // Filtra admin si no tiene permisos (rail y flyout)
  const visibleSections = navSections.filter((s) =>
    s.title === "Admin" ? isPrivilegedUser : true
  );

  // Cierra flyout al navegar si no está fijado
  const handleNavigate = () => {
    if (!pinnedModule) setHoveredModule(null);
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Rail lateral: iconos por módulo */}
      <ModuleRail
        sections={visibleSections}
        current={activeByPath}
        onHover={(m) => setHoveredModule(m)}
        onLeave={() => setHoveredModule(null)}
        onPick={(m) => setPinnedModule((prev) => (prev === m ? null : m))}
        collapsed={railCollapsed}
        setCollapsed={setRailCollapsed}
      />

      {/* Flyout/Panel (texto, sin iconos) */}
      {openSection && (
        <FlyoutPanel
          section={openSection}
          pathname={pathname}
          pinned={!!pinnedModule}
          onPinToggle={() =>
            setPinnedModule((prev) => (prev ? null : openSection.module))
          }
          onNavigate={handleNavigate}
          onMouseEnter={() => setHoveredModule(openSection.module)}
          onMouseLeave={() => setHoveredModule(null)}
        />
      )}

      {/* Contenido principal */}
      <main className="flex-1 min-w-0 grid grid-rows-[auto_1fr]">
        {/* Header superior limpio */}
        <HeaderCompact
          title={
            navSections.find((s) => s.module === activeByPath)?.title || "Santa Brisa"
          }
          moduleAccent={MODULE_ACCENTS[activeByPath]}
          userName={currentUser?.name}
          userEmail={currentUser?.email}
          onLogout={logout}
          isPersistenceEnabled={isPersistenceEnabled}
          togglePersistence={togglePersistence}
        />
        <div className="overflow-y-auto">{children}</div>
        <QuickLogOverlay />
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   7) Header compacto (uniforme, sin tabs superiores)
   ────────────────────────────────────────────────────────────── */
function HeaderCompact({
  title,
  moduleAccent,
  userName,
  userEmail,
  onLogout,
  isPersistenceEnabled,
  togglePersistence,
}: {
  title: string;
  moduleAccent: string;
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
  isPersistenceEnabled: boolean;
  togglePersistence: () => void;
}) {
  const PersistenceIcon = isPersistenceEnabled ? DatabaseZap : DatabaseBackup;
  const persistenceStyles = isPersistenceEnabled
    ? "text-green-700 bg-green-100 hover:bg-green-200 border-green-200"
    : "text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-200";
  const persistenceTooltip = isPersistenceEnabled
    ? "Persistencia con DB activada. Los cambios se guardarán."
    : "Persistencia con DB desactivada. Los cambios son locales y se perderán.";

  return (
    <header className="h-14 border-b border-sb-neutral-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <h1
          className="text-lg font-semibold"
          style={{ color: hsl(moduleAccent) }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={togglePersistence}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${persistenceStyles}`}
          title={persistenceTooltip}
        >
          <PersistenceIcon className="h-4 w-4" />
          <span>{isPersistenceEnabled ? "DB ON" : "DB OFF"}</span>
        </button>

        <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-sb-neutral-50">
          <Avatar name={userName} size="md" className="sb-icon" />
          <div className="hidden md:block leading-tight">
            <div className="text-sm font-medium">{userName}</div>
            <div className="text-xs text-sb-neutral-500">{userEmail}</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-2 py-1.5 rounded-md text-sb-neutral-600 hover:bg-sb-neutral-100"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

// Iconos para HeaderCompact
function DatabaseZap(props: any) { return <LineChart {...props} />; }
function DatabaseBackup(props: any) { return <SlidersHorizontal {...props} />; }
