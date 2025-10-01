// src/components/layouts/AuthenticatedLayout.tsx

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, BarChart3, Megaphone, Factory, ClipboardCheck, Truck,
  LineChart, SlidersHorizontal, LogOut, Plus,
} from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { Avatar } from "@/components/ui/Avatar";
import QuickLogOverlay from "@/features/quicklog/QuickLogOverlay";
import { isSales } from "@/lib/authz";
import { MODULE_ACCENTS } from "@/domain/ssot";
import { RealtimeToggle } from "../RealtimeToggle";


/* ===== 1) Navegación ===== */
type NavItem = { href: string; label: string };
type NavSection = { title: string; module: keyof typeof MODULE_ACCENTS; icon: React.ElementType; items: NavItem[] };

const navSections: NavSection[] = [
  { title: "Personal", module: "personal", icon: Home,
    items: [{ href: "/agenda", label: "Agenda" }, { href: "/contacts", label: "Contactos" }] },
  { title: "Ventas", module: "sales", icon: BarChart3,
    items: [{ href: "/sales/dashboard", label: "Dashboard" }, { href: "/sales/accounts", label: "Cuentas" }, { href: "/sales/orders", label: "Pedidos" }] },
  { title: "Marketing", module: "marketing", icon: Megaphone,
    items: [
      { href: "/marketing/dashboard", label: "Dashboard" },
      { href: "/marketing/events", label: "Eventos" },
      { href: "/marketing/online", label: "Ads" },
      { href: "/marketing/influencers/dashboard", label: "Influencers" },
      { href: "/marketing/pos-tactics", label: "Tácticas POS" },
    ] },
  { title: "Producción", module: "production", icon: Factory,
    items: [{ href: "/production/dashboard", label: "Dashboard" }, { href: "/production/bom", label: "BOMs" }, { href: "/production/execution", label: "Elaboración/Envasado" }] },
  { title: "Calidad", module: "quality", icon: ClipboardCheck,
    items: [
      { href: "/quality/dashboard", label: "Dashboard" },
      { href: "/quality/release", label: "Liberación de Lotes" },
      { href: "/quality/traceability", label: "Trazabilidad" },
      { href: "/quality/autocontrol", label: "Autocontrol" },
      { href: "/quality/parametros", label: "Parámetros" },
    ] },
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
    ] },
];

/* ===== Helpers ===== */
function dashboardHrefFor(module: keyof typeof MODULE_ACCENTS): string {
    if (module === 'sales') return '/sales/dashboard';
  const section = navSections.find(s => s.module === module);
  // Default to the first item in the section if available
  return section?.items[0]?.href || "/";
}

function moduleFromPath(pathname: string): keyof typeof MODULE_ACCENTS | null {
  if (pathname === "/" || pathname.startsWith('/dashboard-personal')) return "personal";
  const section = navSections.find(s => s.items.some(it => pathname.startsWith(it.href)));
  return section?.module || null;
}


/* ===== 3) Layout principal ===== */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { currentUser, logout, data } = useData();
  
  const isPrivilegedUser =
    currentUser?.role?.toLowerCase() === "admin" || currentUser?.role?.toLowerCase() === "owner";
  const visibleSections = navSections.filter((s) => (s.title === "Admin" ? isPrivilegedUser : true));

  const activeModule = moduleFromPath(pathname);
  
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
    <>
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="relative z-50 h-full border-r border-sb-neutral-200 bg-white flex flex-col w-16">
        <Link href="/" className="h-14 flex items-center justify-center border-b">
          <Image src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726" alt="Santa Brisa" width={32} height={24} style={{width: 'auto', height: 'auto'}} priority />
        </Link>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {visibleSections.map(section => {
            const isActiveModule = section.module === activeModule;
            return (
              <div key={section.module} className="relative group">
                <Link href={dashboardHrefFor(section.module)} className={`flex items-center justify-center h-10 w-10 rounded-lg transition-colors ${isActiveModule ? 'bg-primary text-primary-foreground' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                  <section.icon size={20} />
                </Link>
                <div className="absolute left-full top-0 w-56 p-1 hidden group-hover:block z-50">
                  <div className="bg-white border rounded-lg shadow-lg">
                    <div className="p-2 border-b">
                        <p className="text-sm font-semibold">{section.title}</p>
                    </div>
                    <div className="p-1">
                    {section.items.map(item => {
                      const isActiveItem = pathname.startsWith(item.href);
                      return (
                        <Link key={item.href} href={item.href} className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${isActiveItem ? 'font-semibold text-primary' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                          {item.label}
                        </Link>
                      )
                    })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
        {/* Sidebar Footer with User Menu */}
        <div className="mt-auto p-2 border-t border-zinc-200 space-y-2">
            <RealtimeToggle />
            <div ref={menuRef} className="relative">
                <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="w-full"
                >
                    <Avatar name={currentUser?.name} size="md" className="mx-auto" />
                </button>
                 {userMenuOpen && (
                    <div role="menu" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-1 bg-white border rounded-lg shadow-lg">
                      <div className="p-2 border-b">
                        <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{currentUser?.email}</p>
                      </div>
                      <Link href="/profile" role="menuitem" className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-sb-neutral-50">Perfil</Link>
                      <button onClick={logout} role="menuitem" className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-sb-neutral-50">
                        Cerrar sesión
                      </button>
                    </div>
                )}
            </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto bg-secondary">
          {children}
      </main>
    </div>
    {isSales(currentUser?.role) || currentUser?.role === 'admin' ? <QuickLogOverlay /> : null}
    </>
  );
}
