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
function useBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const segs = parts.map((p, i) => ({
    href: "/" + parts.slice(0, i + 1).join("/"),
    label: p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
  return segs.length ? segs : [{ href: "/", label: "Inicio" }];
}
const paletteItems: Array<{ href: string; label: string; module: keyof typeof MODULE_ACCENTS }> =
  navSections.flatMap((s) => s.items.map(it => ({ ...it, module: s.module })));

/* ===== 3) Rail ===== */
function ModuleRail({
  sections, activeModule, onHover, onLeave, collapsed, setCollapsed,
}: {
  sections: NavSection[]; activeModule: string; onHover: (m: string) => void; onLeave: () => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside
      role="navigation"
      aria-label="Módulos"
      className={`h-full ${collapsed ? "w-12" : "w-16"} border-r border-sb-neutral-200 bg-white flex flex-col items-center py-3`}
      onMouseLeave={onLeave}
    >
      <div className="mb-3 p-1 rounded-lg bg-white ring-1 ring-black/5">
        <Image
          src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726"
          alt="Santa Brisa"
          width={collapsed ? 24 : 32}
          height={collapsed ? 24 : 32}
          className="opacity-90"
          priority
        />
      </div>

      <nav className="flex-1 w-full flex flex-col items-center gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = activeModule === s.module;
          const colors = getReadableColors(s.module, isActive ? "active" : "idle");
          return (
            <button
              key={s.module}
              onMouseEnter={() => onHover(s.module)}
              className="relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] hover:bg-sb-neutral-50"
              title={s.title}
              aria-label={s.title}
              aria-current={isActive ? "true" : undefined}
              style={{
                color: colors.fg,
                background: isActive ? colors.bg : undefined,
                border: `1px solid ${isActive ? colors.br : "transparent"}`,
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden
                className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full"
                style={{ background: isActive ? colors.fg : "transparent" }}
              />
              <Icon size={18} />
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expandir rail" : "Colapsar rail"}
        className="w-10 h-10 mb-1 rounded-lg flex items-center justify-center text-sb-neutral-600 hover:bg-sb-neutral-50"
        aria-label={collapsed ? "Expandir rail" : "Colapsar rail"}
      >
        {collapsed ? <PanelRightClose size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </aside>
  );
}

/* ===== 4) MegaFlyout — SOLO la sección hovered abierta ===== */
function MegaFlyout({
  sections, hoveredModule, pathname, onMouseEnter, onMouseLeave,
}: {
  sections: NavSection[]; hoveredModule: string | null; pathname: string;
  onMouseEnter?: () => void; onMouseLeave?: () => void;
}) {
  return (
    <aside
      className="h-full w-72 border-r border-sb-neutral-200 bg-white flex flex-col shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="navigation"
      aria-label="Navegación de áreas"
    >
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {sections.map((section) => {
          const open = hoveredModule === section.module;
          const accent = MODULE_ACCENTS[section.module];
          return (
            <div
              key={section.module}
              className={`rounded-lg border transition-all ${open ? "border-[color:hsl(var(--sb-neutral-300))] bg-[color:hsl(var(--sb-neutral-50))]" : "border-transparent"}`}
            >
              <div
                className="px-3 py-2 flex items-center justify-between rounded-t-lg"
                style={{ background: open ? `hsl(${accent} / 0.08)` : "transparent" }}
              >
                <div className="font-medium">{section.title}</div>
                {/* Dashboard como enlace lateral */}
                <Link
                  href={dashboardHrefFor(section.module)}
                  className="text-xs text-sb-neutral-600 hover:underline"
                >
                  Ver dashboard
                </Link>
              </div>

              {open && (
                <nav className="px-1 py-1">
                  {section.items.map((it) => {
                    const active = it.href !== "/" && pathname.startsWith(it.href);
                    const isPersonal = section.module === "personal";
                    const fg = active
                      ? (isPersonal ? "hsl(var(--sb-neutral-900))" : hsl(accent))
                      : "hsl(var(--sb-neutral-800))";
                    const bg = active ? (isPersonal ? hsl(accent, 0.18) : hsl(accent, 0.10)) : "transparent";
                    const br = active ? (isPersonal ? hsl(accent, 0.28) : hsl(accent, 0.28)) : "transparent";
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        aria-current={active ? "page" : undefined}
                        className="group flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
                        style={{ color: fg, background: bg, border: `1px solid ${br}` }}
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: active ? fg : `hsl(${accent} / 0.6)` }}
                        />
                        <span className="flex-1">{it.label}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-xs text-sb-neutral-400">→</span>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/** Ruta de dashboard por módulo (usada en “Ver dashboard”) */
function dashboardHrefFor(module: keyof typeof MODULE_ACCENTS) {
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
}

/* ===== 5) Header con breadcrumbs + buscador + quicklog + user menu dinámico ===== */
function HeaderPro({
  userName, userEmail, onLogout, pathname, onOpenQuickLog, tasksToday, tasksOverdue,
}: {
  userName?: string; userEmail?: string; onLogout: () => void;
  pathname: string; onOpenQuickLog: () => void;
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
        <Link href="/" className="shrink-0" aria-label="Ir al inicio">
          <span className="inline-flex p-1 rounded-md bg-white ring-1 ring-black/5">
            <Image
              src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726"
              alt="Santa Brisa"
              width={112}
              height={24}
              className="opacity-90"
              priority
            />
          </span>
        </Link>

        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-sm text-sb-neutral-500">
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
            onClick={onOpenQuickLog}
            className="px-2 py-1.5 rounded-md sb-btn-primary"
            title="Captura rápida"
            aria-label="Abrir captura rápida"
          >
            +
          </button>

          <button
            className="px-2 py-1.5 rounded-md hover:bg-sb-neutral-100 flex items-center gap-2"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            title="Cuenta"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            <Avatar name={userName} size="md" className="sb-icon" />
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

/* ===== 7) Layout principal ===== */
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
    // si estás justo en el dashboard de un módulo, marcamos ese
    if (!hit) {
      const mod = moduleFromDashboard(pathname);
      if (mod) return mod;
    }
    return (hit?.module ?? "personal") as keyof typeof MODULE_ACCENTS;
  }, [pathname, visibleSections]);

  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const showFlyout = hoveredModule !== null;

  // sombra header al hacer scroll
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

  // === KPIs del menú de usuario: tareas hoy / atrasadas (DB real vía useData) ===
  const { tasksToday, tasksOverdue } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1) Preferimos data.tasks si existe (schema típico: {dueAt,status,completed?,doneAt?})
    const tasks = (data as any)?.tasks as Array<any> | undefined;

    const fromTasks = tasks
      ? {
          today: tasks.filter(t => t?.dueAt && !t?.completed && new Date(t.dueAt) >= startOfToday && new Date(t.dueAt) <= endOfToday).length,
          overdue: tasks.filter(t => t?.dueAt && !t?.completed && new Date(t.dueAt) < startOfToday).length,
        }
      : null;

    if (fromTasks) return { tasksToday: fromTasks.today, tasksOverdue: fromTasks.overdue };

    // 2) Fallback: derivar de events como “tareas” (p. ej. kind === 'OTRO' | 'TASK' | 'DEMO' etc.)
    const events = (data as any)?.events as Array<any> | undefined;
    const asTasks = (events ?? []).filter(e => !e?.endAt && !/feria|demo|formacion/i.test(String(e?.kind ?? "")));
    const today = asTasks.filter(e => {
      const when = new Date(e?.startAt ?? e?.start ?? e?.date ?? 0);
      const done = !!e?.done || e?.status === "COMPLETADA";
      return !done && when >= startOfToday && when <= endOfToday;
    }).length;

    const overdue = asTasks.filter(e => {
      const when = new Date(e?.startAt ?? e?.start ?? e?.date ?? 0);
      const done = !!e?.done || e?.status === "COMPLETADA";
      return !done && when < startOfToday;
    }).length;

    return { tasksToday: today, tasksOverdue: overdue };
  }, [(useData() as any).data]); // fuerza recálculo si cambia

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

      {showFlyout && (
        <MegaFlyout
          sections={visibleSections}
          hoveredModule={hoveredModule}
          pathname={pathname}
          onMouseEnter={() => setHoveredModule(hoveredModule)}
          onMouseLeave={() => setHoveredModule(null)}
        />
      )}

      <main className="flex-1 min-w-0 grid grid-rows-[auto_1fr]">
        <HeaderPro
          userName={currentUser?.name}
          userEmail={currentUser?.email}
          onLogout={logout}
          pathname={pathname}
          onOpenQuickLog={() => window.dispatchEvent(new CustomEvent("sb:quicklog:open"))}
          tasksToday={tasksToday}
          tasksOverdue={tasksOverdue}
        />
        <div className="overflow-y-auto">{children}</div>
        <QuickLogOverlay />
      </main>
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
