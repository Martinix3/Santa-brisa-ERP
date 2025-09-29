
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, BarChart3, Megaphone, Factory, ClipboardCheck, Truck,
  LineChart, SlidersHorizontal, LogOut, PanelRightClose, PanelLeftClose, Plus,
} from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { Avatar } from "@/components/ui/Avatar";
import QuickLogOverlay from "@/features/quicklog/QuickLogOverlay";
import { isSales } from "@/lib/authz";


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

/** Mejor contraste para "personal" */
function getReadableColors(module: keyof typeof MODULE_ACCENTS, state: "idle" | "hover" | "active") {
  const accent = MODULE_ACCENTS[module];
  const isPersonal = module === "personal";
  if (state === "active") {
    return {
      fg: isPersonal ? "hsl(var(--sb-neutral-900))" : hsl(accent),
      bg: isPersonal ? hsl(accent, 0.22) : hsl(accent, 0.12),
      br: isPersonal ? hsl(accent, 0.40) : hsl(accent, 0.35),
    };
  }
  if (state === "hover") {
    return {
      fg: isPersonal ? "hsl(var(--sb-neutral-800))" : `hsl(var(--sb-neutral-700))`,
      bg: isPersonal ? hsl(accent, 0.14) : "hsl(var(--sb-neutral-50))",
      br: isPersonal ? hsl(accent, 0.28) : "transparent",
    };
  }
  return { fg: "hsl(var(--sb-neutral-600))", bg: "transparent", br: "transparent" };
}

/* ===== 1) Navegación ===== */
type NavItem = { href: string; label: string };
type NavSection = { title: string; module: keyof typeof MODULE_ACCENTS; icon: React.ElementType; items: NavItem[] };

/** IMPORTANTE: sin 'Dashboard' en items (lo mostramos como "Ver dashboard" en el header de sección) */
const navSections: NavSection[] = [
  { title: "Personal", module: "personal", icon: Home,
    items: [{ href: "/agenda", label: "Agenda" }, { href: "/contacts", label: "Contactos" }] },
  { title: "Ventas", module: "sales", icon: BarChart3,
    items: [{ href: "/accounts", label: "Cuentas" }, { href: "/orders", label: "Pedidos" }] },
  { title: "Marketing", module: "marketing", icon: Megaphone,
    items: [
      { href: "/marketing/events", label: "Eventos" },
      { href: "/marketing/online", label: "Ads" },
      { href: "/marketing/influencers", label: "Influencers" },
      { href: "/marketing/pos-tactics", label: "Tácticas POS" },
      { href: "/marketing/pos-catalog", label: "Catálogo Tácticas" },
    ] },
  { title: "Producción", module: "production", icon: Factory,
    items: [{ href: "/production/bom", label: "BOMs" }, { href: "/production/execution", label: "Elaboración/Envasado" }] },
  { title: "Calidad", module: "quality", icon: ClipboardCheck,
    items: [
      { href: "/quality/release", label: "Liberación de Lotes" },
      { href: "/quality/traceability", label: "Trazabilidad" },
      { href: "/quality/autocontrol", label: "Autocontrol" },
      { href: "/quality/parametros", label: "Parámetros" },
    ] },
  { title: "Logística", module: "warehouse", icon: Truck,
    items: [{ href: "/warehouse/logistics", label: "Envíos" }, { href: "/warehouse/inventory", label: "Inventario" }] },
  { title: "Financiera", module: "finance", icon: LineChart,
    items: [{ href: "/cashflow/payments", label: "Pagos" }, { href: "/cashflow/collections", label: "Cobros" }] },
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

/* ===== 2) Persistencia ===== */
const LS_COLLAPSED = "sb.nav.collapsed";

/* ===== Helpers ===== */
function useBreadcrumbs(pathname: string | null) {
  const safePath = pathname || "";
  const parts = safePath.split("/").filter(Boolean);
  const segs = parts.map((p, i) => ({
    href: "/" + parts.slice(0, i + 1).join("/"),
    label: p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
  return segs.length ? segs : [{ href: "/", label: "Inicio" }];
}
const paletteItems: Array<{ href: string; label: string; module: keyof typeof MODULE_ACCENTS }> =
  navSections.flatMap((s) => s.items.map(it => ({ ...it, module: s.module })));

function dashboardHrefFor(module: keyof typeof MODULE_ACCENTS): string {
  switch (module) {
    case "personal": return "/dashboard-personal";
    case "sales": return "/dashboard-ventas";
    case "marketing": return "/marketing/dashboard";
    case "production": return "/production/dashboard";
    case "quality": return "/quality/dashboard";
    case "warehouse": return "/warehouse/dashboard";
    case "finance": return "/cashflow/dashboard";
    case "admin": return "/admin/kpi-settings"; // o tu landing de admin
  }
  return "/";
}

/* ===== 3) Layout principal ===== */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { currentUser, logout, data } = useData();
  
  const isPrivilegedUser =
    currentUser?.role?.toLowerCase() === "admin" || currentUser?.role?.toLowerCase() === "owner";
  const visibleSections = navSections.filter((s) => (s.title === "Admin" ? isPrivilegedUser : true));

  const [collapsed, setCollapsed] = useState<boolean>(() =>
    (typeof window !== "undefined" ? localStorage.getItem(LS_COLLAPSED) === "1" : false)
  );
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0"); }, [collapsed]);

  const activeModule = useMemo(() => {
    const hit = visibleSections.find((sec) => sec.items.some((i) => pathname.startsWith(i.href) && i.href !== "/"));
    if (!hit) {
      const mod = moduleFromDashboard(pathname);
      if (mod) return mod;
    }
    return (hit?.module ?? "personal") as keyof typeof MODULE_ACCENTS;
  }, [pathname, visibleSections]);
  
  const activeSection = navSections.find(s => s.module === activeModule);

  useEffect(() => {
    const root = document.documentElement;
    const target = document.querySelector("main > div.overflow-y-auto");
    if (!target) return;
    const onScroll = () => {
      if ((target as HTMLElement).scrollTop > 2) root.classList.add("scrolled");
      else root.classList.remove("scrolled");
    };
    target.addEventListener("scroll", onScroll);
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  const { tasksToday, tasksOverdue } = useMemo(() => {
    if (!data?.interactions) return { tasksToday: 0, tasksOverdue: 0 };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tasks = (data.interactions || []).filter(i => i.status === 'open' && i.plannedFor);
    return {
      tasksToday: tasks.filter(t => { const d = new Date(t.plannedFor!); return d >= startOfToday; }).length,
      tasksOverdue: tasks.filter(t => new Date(t.plannedFor!) < startOfToday).length,
    }
  }, [data]);

  return (
    <>
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <aside className={`h-full border-r border-sb-neutral-200 bg-white flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
        <Link href="/" className={`h-14 flex items-center border-b px-4 ${collapsed ? 'justify-center' : ''}`}>
          <Image src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726" alt="Santa Brisa" width={collapsed ? 32 : 112} height={24} style={{width: 'auto', height: 'auto'}} priority />
        </Link>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {visibleSections.map(section => {
            const isActiveModule = section.module === activeModule;
            const accent = MODULE_ACCENTS[section.module];
            return (
              <div key={section.module} style={{'--accent': accent} as React.CSSProperties}>
                <Link href={dashboardHrefFor(section.module)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-semibold ${isActiveModule ? 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]' : 'text-zinc-700 hover:bg-zinc-100'}`}>
                  <section.icon size={20} />
                  {!collapsed && <span>{section.title}</span>}
                </Link>
                {!collapsed && isActiveModule && (
                  <div className="pl-6 mt-1 space-y-0.5 border-l-2 ml-4" style={{borderColor: `hsl(${accent}/.2)`}}>
                    {section.items.map(item => {
                      const isActiveItem = pathname.startsWith(item.href);
                      return (
                        <Link key={item.href} href={item.href} className={`block px-4 py-1.5 text-sm rounded-md transition-colors ${isActiveItem ? 'font-semibold text-[hsl(var(--accent))]' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <div className="p-2 border-t">
          <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center gap-2 h-10 rounded-md text-zinc-600 hover:bg-zinc-100">
            {collapsed ? <PanelRightClose size={18}/> : <PanelLeftClose size={18}/>}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 grid grid-rows-[auto_1fr]">
        <HeaderPro
          userName={currentUser?.name}
          userEmail={currentUser?.email}
          onLogout={logout}
          pathname={pathname}
          tasksToday={tasksToday}
          tasksOverdue={tasksOverdue}
        />
        <div className="overflow-y-auto">{children}</div>
      </main>
    </div>
    {isSales(currentUser?.role) || currentUser?.role === 'admin' ? <QuickLogOverlay /> : null}
    </>
  );
}

function HeaderPro({
  userName, userEmail, onLogout, pathname, tasksToday, tasksOverdue
}: {
  userName?: string; userEmail?: string; onLogout: () => void;
  pathname: string;
  tasksToday: number; tasksOverdue: number;
}) {
  const crumbs = useBreadcrumbs(pathname);
  const [openCmd, setOpenCmd] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Cmd+K y Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpenCmd(true); }
      if (e.key === "Escape") { setOpenCmd(false); setUserMenuOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cerrar menú usuario al click fuera
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userMenuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [userMenuOpen]);

  // Cerrar al navegar
  useEffect(() => { setUserMenuOpen(false); }, [pathname]);

  return (
    <header className="h-14 sticky top-0 z-40 border-b border-sb-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80" role="banner">
      <div className="h-full px-3 md:px-4 flex items-center gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-sb-neutral-500">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center">
              {i > 0 && <span className="mx-1 text-sb-neutral-400">/</span>}
              <Link
                href={c.href}
                className={`hover:underline ${i === crumbs.length - 1 ? "text-sb-neutral-900 font-medium" : ""}`}
                aria-current={i === crumbs.length - 1 ? "page" : undefined}
              >
                {c.label}
              </Link>
            </span>
          ))}
        </nav>

        <button
          onClick={() => setOpenCmd(true)}
          className="ml-auto md:ml-4 flex-1 max-w-md hidden md:flex items-center gap-2 px-3 h-9 rounded-md border text-sm text-sb-neutral-600 hover:bg-sb-neutral-50"
          aria-label="Abrir paleta de comandos (Control o Command + K)"
          title="Buscar (⌘K)"
        >
          <span className="i-magnifier" aria-hidden />
          <span className="truncate">Buscar páginas y acciones…</span>
          <kbd className="ml-auto text-xs text-sb-neutral-400">⌘K</kbd>
        </button>

        <div className="ml-auto md:ml-2 flex items-center gap-1" ref={menuRef}>
          <button
            className="px-2 py-1.5 rounded-md hover:bg-sb-neutral-100 flex items-center gap-2"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            title="Cuenta"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            <Avatar name={userName} size="md" />
            <div className="hidden md:block leading-tight text-left">
              <div className="text-sm font-medium">{userName}</div>
              <div className="text-xs text-sb-neutral-500">{userEmail}</div>
            </div>
          </button>

          {userMenuOpen && (
            <div role="menu" className="sb-menu absolute right-3 top-12 w-64 p-1">
              <div className="px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Tareas hoy</span>
                  <span className="font-semibold">{tasksToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tareas atrasadas</span>
                  <span className="font-semibold text-rose-600">{tasksOverdue}</span>
                </div>
              </div>
              <hr className="my-1" />
              <Link href="/profile" role="menuitem" className="block px-3 py-2 rounded-md hover:bg-sb-neutral-50">Perfil</Link>
              <Link href="/settings" role="menuitem" className="block px-3 py-2 rounded-md hover:bg-sb-neutral-50">Preferencias</Link>
              <button onClick={onLogout} role="menuitem" className="w-full text-left px-3 py-2 rounded-md hover:bg-sb-neutral-50">
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {openCmd && <CommandPalette onClose={() => setOpenCmd(false)} />}
    </header>
  );
}

/* ===== 6) Paleta simple ===== */
function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return paletteItems.slice(0, 8);
    return paletteItems
      .filter(p => p.label.toLowerCase().includes(t) || p.href.toLowerCase().includes(t))
      .slice(0, 12);
  }, [q]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-start pt-24 bg-black/30" onClick={onClose}>
      <div className="sb-menu w-[min(720px,92vw)] mx-auto p-2" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="w-full h-10 px-3 rounded-md border outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          aria-label="Buscar en navegación"
        />
        <div className="mt-2 max-h-[50vh] overflow-auto">
          {results.map((r) => (
            <Link
              key={`${r.module}:${r.href}`}
              href={r.href}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sb-neutral-50"
              onClick={onClose}
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: hsl(MODULE_ACCENTS[r.module], 0.9) }} />
              <span className="font-medium">{r.label}</span>
              <span className="ml-auto text-xs text-sb-neutral-500">{r.href}</span>
            </Link>
          ))}
          {!results.length && <div className="px-3 py-4 text-sm text-sb-neutral-500">Sin resultados</div>}
        </div>
      </div>
    </div>
  );
}

/* util: detectar módulo desde la ruta de dashboard */
function moduleFromDashboard(path: string): keyof typeof MODULE_ACCENTS | null {
  if (path.startsWith("/dashboard-personal")) return "personal";
  if (path.startsWith("/dashboard-ventas")) return "sales";
  if (path.startsWith("/marketing/dashboard")) return "marketing";
  if (path.startsWith("/production/dashboard")) return "production";
  if (path.startsWith("/quality/dashboard")) return "quality";
  if (path.startsWith("/warehouse/dashboard")) return "warehouse";
  if (path.startsWith("/cashflow/dashboard")) return "finance";
  return null;
}
