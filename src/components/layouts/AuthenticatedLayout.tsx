"use client";

import React, { useEffect, useMemo, useState } from "react";
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

/* ===== 0) Tokens ===== */
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

/* ===== 1) Navegación ===== */
type NavItem = { href: string; label: string };
type NavSection = { title: string; module: keyof typeof MODULE_ACCENTS; icon: React.ElementType; items: NavItem[] };

const navSections: NavSection[] = [
  { title: "Personal", module: "personal", icon: Home,
    items: [{ href: "/dashboard-personal", label: "Dashboard" }, { href: "/agenda", label: "Agenda" }, { href: "/contacts", label: "Contactos" }] },
  { title: "Ventas", module: "sales", icon: BarChart3,
    items: [{ href: "/dashboard-ventas", label: "Dashboard de Ventas" }, { href: "/accounts", label: "Cuentas" }, { href: "/orders", label: "Pedidos" }] },
  { title: "Marketing", module: "marketing", icon: Megaphone,
    items: [
      { href: "/marketing/dashboard", label: "Dashboard" },
      { href: "/marketing/events", label: "Eventos" },
      { href: "/marketing/online", label: "Ads" },
      { href: "/marketing/influencers", label: "Influencers" },
      { href: "/marketing/pos-tactics", label: "Tácticas POS" },
      { href: "/marketing/pos-catalog", label: "Catálogo Tácticas" },
    ] },
  { title: "Producción", module: "production", icon: Factory,
    items: [{ href: "/production/dashboard", label: "Dashboard" }, { href: "/production/bom", label: "BOMs" }, { href: "/production/execution", label: "Elaboración/Envasado" }] },
  { title: "Calidad", module: "quality", icon: ClipboardCheck,
    items: [{ href: "/quality/dashboard", label: "Dashboard QC" }, { href: "/quality/release", label: "Liberación de Lotes" }, { href: "/quality/traceability", label: "Trazabilidad" }] },
  { title: "Logística", module: "warehouse", icon: Truck,
    items: [{ href: "/warehouse/dashboard", label: "Dashboard" }, { href: "/warehouse/logistics", label: "Envíos" }, { href: "/warehouse/inventory", label: "Inventario" }] },
  { title: "Financiera", module: "finance", icon: LineChart,
    items: [{ href: "/cashflow/dashboard", label: "Dashboard" }, { href: "/cashflow/payments", label: "Pagos" }, { href: "/cashflow/collections", label: "Cobros" }] },
  { title: "Admin", module: "admin", icon: SlidersHorizontal,
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
    ] },
];

/* ===== 2) Persistencia mínima ===== */
const LS_COLLAPSED = "sb.nav.collapsed";

/* ===== 3) Rail ===== */
function ModuleRail({
  sections, activeModule, onHover, onLeave, collapsed, setCollapsed,
}: {
  sections: NavSection[]; activeModule: string; onHover: (m: string) => void; onLeave: () => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside
      className={`h-full ${collapsed ? "w-12" : "w-16"} border-r border-sb-neutral-200 bg-white flex flex-col items-center py-3`}
      onMouseLeave={onLeave}
    >
      <Image
        src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726"
        alt="Santa Brisa"
        width={collapsed ? 24 : 32}
        height={collapsed ? 24 : 32}
        className="mb-3 opacity-90"
        priority
      />
      <nav className="flex-1 w-full flex flex-col items-center gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = activeModule === s.module;
          return (
            <button
              key={s.module}
              onMouseEnter={() => onHover(s.module)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
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

/* ===== 4) Flyout simple (ajustado ancho) ===== */
function SimpleFlyout({
  section, pathname, onMouseEnter, onMouseLeave,
}: {
  section: NavSection; pathname: string; onMouseEnter?: () => void; onMouseLeave?: () => void;
}) {
  const accent = MODULE_ACCENTS[section.module];
  return (
    <aside
      className="h-full w-56 border-r border-sb-neutral-200 bg-white flex flex-col shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`${section.title}`}
    >
      <nav className="flex-1 px-2 py-3 space-y-1">
        {section.items.map((it) => {
          const active = it.href !== "/" && pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
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

/* ===== 5) Header compacto (solo logo) ===== */
function HeaderCompact({
  userName, userEmail, onLogout,
}: {
  userName?: string; userEmail?: string; onLogout: () => void;
}) {
  return (
    <header className="h-14 border-b border-sb-neutral-200 bg-white flex items-center justify-between px-4">
      <Image
        src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726"
        alt="Santa Brisa"
        width={128}
        height={28}
        className="opacity-90"
        priority
      />
      <div className="flex items-center gap-2">
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

/* ===== 6) Layout principal ===== */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { currentUser, logout } = useData();

  // permisos Admin mínimos
  const isPrivilegedUser =
    currentUser?.role?.toLowerCase() === "admin" || currentUser?.role?.toLowerCase() === "owner";
  const visibleSections = navSections.filter((s) => (s.title === "Admin" ? isPrivilegedUser : true));

  // rail collapsed (única preferencia)
  const [collapsed, setCollapsed] = useState<boolean>(() => (typeof window !== "undefined" ? localStorage.getItem(LS_COLLAPSED) === "1" : false));
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0"); }, [collapsed]);

  // módulo activo por path
  const activeModule = useMemo(() => {
    const hit = visibleSections.find((sec) => sec.items.some((i) => pathname.startsWith(i.href) && i.href !== "/"));
    return hit?.module ?? "personal";
  }, [pathname, visibleSections]);

  // hover para flyout
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const openSection = hoveredModule ? visibleSections.find(s => s.module === hoveredModule) ?? null : null;

  return (
    <div className="h-screen flex bg-white">
      <ModuleRail
        sections={visibleSections}
        activeModule={activeModule}
        onHover={(m) => setHoveredModule(m)}
        onLeave={() => setHoveredModule(null)}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {openSection && (
        <SimpleFlyout
          section={openSection}
          pathname={pathname}
          onMouseEnter={() => setHoveredModule(openSection.module)}
          onMouseLeave={() => setHoveredModule(null)}
        />
      )}

      <main className="flex-1 min-w-0 grid grid-rows-[auto_1fr]">
      <HeaderCompact
  userName={currentUser?.name}
  userEmail={currentUser?.email}
  onLogout={logout}
/>
        <div className="overflow-y-auto">{children}</div>
        <QuickLogOverlay />
      </main>
    </div>
  );
}
