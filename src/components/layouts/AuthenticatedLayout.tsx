// src/components/layouts/AuthenticatedLayout.tsx

"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
import { PersistenceToggle } from "../ui/PersistenceToggle";


/* ===== 1) Navegación ===== */
type NavItem = { href: string; label: string };
type NavSection = { title: string; module: keyof typeof MODULE_ACCENTS; icon: React.ElementType; items: NavItem[] };

const navSections: NavSection[] = [
  { title: "Personal", module: "personal", icon: Home,
    items: [{ href: "/dashboard-personal", label: "Mi Dashboard" }, { href: "/agenda", label: "Agenda" }, { href: "/contacts", label: "Contactos" }] },
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
    if (module === 'personal') return '/dashboard-personal';
    const section = navSections.find(s => s.module === module);
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
  const router = useRouter();
  const { currentUser, logout } = useData();

  useEffect(() => {
    // Si por alguna razón este layout se renderiza sin un usuario,
    // es un estado inválido y debemos forzar el retorno al login.
    if (!currentUser) {
      router.replace('/login');
    }
  }, [currentUser, router]);
  
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

  // No renderizar nada si no hay usuario, el useEffect se encargará de redirigir.
  if (!currentUser) {
    return null;
  }

  return (
    <>
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="relative z-50 h-full border-r border-border bg-background flex flex-col w-16">
        <Link href="/" aria-label="Dashboard principal" className="h-14 flex items-center justify-center border-b focus-ring rounded-md">
          <Image src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726" alt="Santa Brisa" width={32} height={24} style={{width: 'auto', height: 'auto'}} priority />
        </Link>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {visibleSections.map(section => {
            const isActiveModule = section.module === activeModule;
            return (
              <div key={section.module} className="relative group ">
                <Link href={dashboardHrefFor(section.module)} aria-label={section.title} className={`flex items-center justify-center h-10 w-10 rounded-lg transition-colors focus-ring ${isActiveModule ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                  <section.icon size={20} />
                </Link>
                <div className="absolute left-full top-0 w-56 p-1 hidden group-hover:block group-focus-within:block z-50">
                  <div className="bg-card border rounded-lg shadow-lg">
                    <div className="p-2 border-b">
                        <p className="text-sm font-semibold">{section.title}</p>
                    </div>
                    <div className="p-1">
                    {section.items.map(item => {
                      const isActiveItem = pathname.startsWith(item.href);
                      return (
                        <Link key={item.href} href={item.href} className={`block px-3 py-1.5 text-sm rounded-md transition-colors focus-ring ${isActiveItem ? 'font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
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
        <div className="mt-auto p-2 border-t border-border space-y-2">
            <RealtimeToggle />
            <PersistenceToggle />
            <div ref={menuRef} className="relative">
                <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    aria-label="Abrir menú de usuario"
                    aria-haspopup="true"
                    aria-expanded={userMenuOpen}
                    className="w-full rounded-md focus-ring"
                >
                    <Avatar name={currentUser?.name} size="md" className="mx-auto" />
                </button>
                 {userMenuOpen && (
                    <div role="menu" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-1 bg-card border rounded-lg shadow-lg">
                      <div className="p-2 border-b">
                        <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                      </div>
                      <Link href="/profile" role="menuitem" className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary focus-ring">Perfil</Link>
                      <button onClick={logout} role="menuitem" className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary focus-ring">
                        Cerrar sesión
                      </button>
                    </div>
                )}
            </div>
        </div>
      </aside>

      <main id="main-content" className="flex-1 min-w-0 overflow-y-auto bg-secondary">
          {children}
      </main>
    </div>
    {isSales(currentUser?.role) || currentUser?.role === 'admin' ? <QuickLogOverlay /> : null}
    </>
  );
}
