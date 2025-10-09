"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, BarChart3, Megaphone, Factory, ClipboardCheck, Truck,
  LineChart, SlidersHorizontal, ChevronLeft, ChevronRight,
} from "lucide-react";
import { MODULE_ACCENTS, type Department } from "@/domain/ssot";
import { cn } from "@/lib/utils";

/* ===== Types ===== */
type NavItem = { href: string; label: string };
type NavSection = {
  title: string;
  module: keyof typeof MODULE_ACCENTS;
  icon: React.ElementType;
  items: NavItem[];
};

/* ===== Navigation Structure ===== */
export const navSections: NavSection[] = [
  {
    title: "Personal",
    module: "personal",
    icon: Home,
    items: [
      { href: "/dashboard-personal", label: "Mi Dashboard" },
      { href: "/agenda", label: "Agenda" },
      { href: "/contacts", label: "Contactos" },
    ],
  },
  {
    title: "Ventas",
    module: "sales",
    icon: BarChart3,
    items: [
      { href: "/sell-out", label: "Sell-Out (Colocación)" },
      { href: "/sell-in", label: "Sell-In (Directas)" },
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
      { href: "/marketing/pos-tactics", label: "Tácticas POS" },
    ],
  },
  {
    title: "Producción",
    module: "production",
    icon: Factory,
    items: [
      { href: "/production/dashboard", label: "Dashboard" },
      { href: "/production/bom", label: "BOMs" },
      { href: "/production/execution", label: "Elaboración" },
    ],
  },
  {
    title: "Calidad",
    module: "quality",
    icon: ClipboardCheck,
    items: [
      { href: "/quality/dashboard", label: "Dashboard" },
      { href: "/quality/release", label: "Liberación" },
      { href: "/quality/traceability", label: "Trazabilidad" },
      { href: "/quality/parametros", label: "Parámetros" },
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
      { href: "/admin/db-check", label: "Diagnóstico DB" },
      { href: "/admin/fix-dates", label: "Actualizar Fechas" },
      { href: "/admin/kpi-settings", label: "Ajustes KPIs" },
      { href: "/admin/users", label: "Usuarios" },
      { href: "/admin/sku-management", label: "SKUs" },
      { href: "/admin/integrations", label: "Integraciones" },
    ],
  },
];

/* ===== Helper Functions ===== */
export function moduleFromPath(pathname: string): keyof typeof MODULE_ACCENTS | null {
  if (pathname === "/" || pathname.startsWith("/dashboard-personal")) return "personal";
  const section = navSections.find((s) =>
    s.items.some((it) => pathname.startsWith(it.href))
  );
  return section?.module || null;
}

export function dashboardHrefFor(module: keyof typeof MODULE_ACCENTS): string {
  if (module === "personal") return "/dashboard-personal";
  const section = navSections.find((s) => s.module === module);
  return section?.items[0]?.href || "/";
}

/* ===== Sidebar Component ===== */
type SidebarProps = {
  isAdmin: boolean;
};

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("sidebar-expanded");
    if (saved !== null) {
      setIsExpanded(saved === "true");
    }
  }, []);

  // Save state to localStorage
  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem("sidebar-expanded", String(newState));
  };

  const visibleSections = navSections.filter((s) =>
    s.title === "Admin" ? isAdmin : true
  );
  const activeModule = moduleFromPath(pathname);

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <aside className="hidden md:block relative h-full border-r border-border bg-background w-16" />
    );
  }

  return (
    <aside
      className={cn(
        "hidden md:flex relative h-full border-r border-border bg-background flex-col transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        aria-label="Dashboard principal"
        className="h-14 flex items-center border-b border-border px-3 focus-ring"
      >
        <Image
          src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726"
          alt="Santa Brisa"
          width={32}
          height={24}
          style={{ width: "auto", height: "auto" }}
          priority
          className={cn("transition-all", isExpanded ? "mr-3" : "")}
        />
        {isExpanded && (
          <span className="font-semibold text-sm whitespace-nowrap overflow-hidden">
            Santa Brisa
          </span>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {visibleSections.map((section) => {
          const isActiveModule = section.module === activeModule;
          const Icon = section.icon;

          return (
            <div key={section.module} className="space-y-1">
              {/* Section Header */}
              <Link
                href={dashboardHrefFor(section.module)}
                className={cn(
                  "flex items-center h-10 rounded-lg transition-all focus-ring group",
                  isExpanded ? "px-3 justify-start" : "px-0 justify-center",
                  isActiveModule
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon size={20} className="flex-shrink-0" />
                {isExpanded && (
                  <span className="ml-3 text-sm whitespace-nowrap">
                    {section.title}
                  </span>
                )}
              </Link>

              {/* Sub-items (only when expanded and active) */}
              {isExpanded && isActiveModule && (
                <div className="ml-3 pl-3 border-l-2 border-border space-y-1">
                  {section.items.map((item) => {
                    const isActiveItem = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block px-3 py-1.5 text-sm rounded-md transition-colors focus-ring",
                          isActiveItem
                            ? "font-medium text-primary bg-primary/10"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        aria-label={isExpanded ? "Colapsar sidebar" : "Expandir sidebar"}
        className={cn(
          "absolute -right-3 top-20 z-50 h-6 w-6 rounded-full bg-background border-2 border-border flex items-center justify-center hover:bg-secondary transition-colors focus-ring",
          "shadow-sm"
        )}
      >
        {isExpanded ? (
          <ChevronLeft size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </button>
    </aside>
  );
}
