
// src/components/layouts/AuthenticatedLayout.tsx

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
import { MODULE_ACCENTS } from "@/domain/ssot";
import { RealtimeBadge } from "../RealtimeBadge";
import { RealtimeToggle } from "../RealtimeToggle";


/* ===== 1) Navegación ===== */
type NavItem = { href: string; label: string };
type NavSection = { title: string; module: keyof typeof MODULE_ACCENTS; icon: React.ElementType; items: NavItem[] };

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
    case "personal": return "/agenda"; // Updated to point directly to a feature
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
      <aside className="relative z-50 h-full border-r border-sb-neutral-200 bg-white flex flex-col w-16">
        <Link href="/" className="h-14 flex items-center justify-center border-b">
          <Image src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726" alt="Santa Brisa" width={32} height={24} style={{width: 'auto', height: 'auto'}} priority />
        </Link>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {visibleSections.map(section => {
            const isActiveModule = section.module === activeModule;
            return (
              <div key={section.module} className="relative group">
                <Link href={dashboardHrefFor(section.module)} className={`flex items-center justify-center h-10 w-10 rounded-lg transition-colors ${isActiveModule ? 'bg-yellow-100 text-yellow-800' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                  <section.icon size={20} />
                </Link>
                <div className="absolute left-full top-0 ml-2 w-48 bg-white border rounded-lg shadow-lg hidden group-hover:block z-50">
                  <div className="p-2 border-b">
                      <p className="text-sm font-semibold">{section.title}</p>
                  </div>
                  <div className="p-1">
                  {section.items.map(item => {
                    const isActiveItem = pathname.startsWith(item.href);
                    return (
                      <Link key={item.href} href={item.href} className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${isActiveItem ? 'font-semibold text-yellow-800 bg-yellow-50' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                        {item.label}
                      </Link>
                    )
                  })}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
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
  userName, userEmail, onLogout
}: {
  userName?: string; userEmail?: string; onLogout: () => void;
  pathname: string;
  tasksToday: number; tasksOverdue: number;
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userMenuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [userMenuOpen]);


  return (
    <header className="h-14 sticky top-0 z-40 border-b border-sb-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80" role="banner">
      <div className="h-full px-3 md:px-4 flex items-center gap-3">
        {/* Empty space to push user menu to the right */}
        <div className="flex-1" />
        
        <div className="ml-auto md:ml-2 flex items-center gap-1" ref={menuRef}>
          <RealtimeToggle />
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
              <Link href="/profile" role="menuitem" className="block px-3 py-2 rounded-md hover:bg-sb-neutral-50">Perfil</Link>
              <Link href="/settings" role="menuitem" className="block px-3 py-2 rounded-md hover:bg-sb-neutral-50">Preferencias</Link>
              <button onClick={onLogout} role="menuitem" className="w-full text-left px-3 py-2 rounded-md hover:bg-sb-neutral-50">
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* util: detectar módulo desde la ruta de dashboard */
function moduleFromDashboard(path: string): keyof typeof MODULE_ACCENTS | null {
  if (path.startsWith("/dashboard-ventas")) return "sales";
  if (path.startsWith("/marketing/dashboard")) return "marketing";
  if (path.startsWith("/production/dashboard")) return "production";
  if (path.startsWith("/quality/dashboard")) return "quality";
  if (path.startsWith("/warehouse/dashboard")) return "warehouse";
  if (path.startsWith("/cashflow/dashboard")) return "finance";
  if (path.startsWith("/agenda")) return "personal";
  return null;
}
