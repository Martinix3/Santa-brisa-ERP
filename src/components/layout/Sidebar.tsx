"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, ShoppingCart, Megaphone, Factory, 
  ShieldCheck, Truck, DollarSign, Settings, ChevronLeft, ChevronRight,
  Building2, ListChecks, FileText, Handshake, MonitorPlay, PartyPopper,
  Store, Package, TestTube, GitBranch, FileCheck, PackageCheck, 
  PackageOpen, Box, Boxes, Wrench, Plug2, Sliders, UserCog, FolderKanban,
} from "lucide-react";
import { MODULE_ACCENTS, type Department } from "@/domain/ssot";
import { cn } from "@/lib/utils";

/* ===== Types ===== */
type NavItem = { href: string; label: string };
type NavSection = {
  title: string;
  module: keyof typeof MODULE_ACCENTS;
  icon: React.ElementType;
  href?: string;
  items: NavItem[];
};

/* ===== Navigation Structure ===== */
export const navSections: NavSection[] = [
  {
    title: "Inicio",
    module: "personal",
    icon: LayoutDashboard,
    href: "/dashboard",
    items: [
      { href: "/calendario", label: "Calendario/Tareas" },
      { href: "/proyectos", label: "Proyectos" },
      { href: "/contacts", label: "Contactos" },
    ],
  },
  {
    title: "Ventas",
    module: "sales",
    icon: ShoppingCart,
    href: "/ventas/dashboard",
    items: [
      { href: "/ventas/cuentas", label: "Cuentas" },
      { href: "/ventas/pedidos", label: "Pedidos" },
    ],
  },
  {
    title: "Marketing",
    module: "marketing",
    icon: Megaphone,
    href: "/marketing/dashboard",
    items: [
      { href: "/marketing/collabs", label: "Collabs" },
      { href: "/marketing/ads", label: "Ads" },
      { href: "/marketing/events-activations", label: "Events" },
      { href: "/marketing/pos-mkt", label: "POS" },
    ],
  },
  {
    title: "Calidad",
    module: "quality",
    icon: ShieldCheck,
    href: "/quality/dashboard",
    items: [
      { href: "/quality/lot-release", label: "Lot Release" },
      { href: "/quality/traceability", label: "Trazabilidad" },
      { href: "/quality/parametros", label: "Parámetros" },
    ],
  },
  {
    title: "Almacén",
    module: "warehouse",
    icon: Truck,
    href: "/warehouse/dashboard",
    items: [
      { href: "/warehouse/inventory", label: "Inventario" },
      { href: "/warehouse/goods-receipt", label: "Recepciones" },
      { href: "/warehouse/logistics", label: "Logística" },
    ],
  },
  {
    title: "Producción",
    module: "production",
    icon: Factory,
    href: "/production/dashboard",
    items: [
      { href: "/production/bom", label: "BOM" },
      { href: "/production/execution", label: "Execution" },
    ],
  },
  {
    title: "Finanzas",
    module: "finance",
    icon: DollarSign,
    href: "/finance/dashboard",
    items: [
      { href: "/finance/cobros", label: "Cobros" },
      { href: "/finance/pagos", label: "Pagos" },
    ],
  },
  {
    title: "Admin",
    module: "admin",
    icon: Settings,
    href: "/admin",
    items: [
      { href: "/admin/integrations", label: "Integraciones" },
      { href: "/admin/variables", label: "Variables" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/users", label: "Users" },
    ],
  },
];

/* ===== Helper Functions ===== */
export function moduleFromPath(pathname: string): keyof typeof MODULE_ACCENTS | null {
  const directSection = navSections.find((s) => s.href && pathname.startsWith(s.href));
  if (directSection) return directSection.module;
  
  const section = navSections.find((s) =>
    s.items.some((it) => pathname.startsWith(it.href))
  );
  return section?.module || null;
}

export function getSectionHref(section: NavSection): string {
  if (section.href) return section.href;
  return section.items[0]?.href || "/";
}

/* ===== Sidebar Component ===== */
type SidebarProps = {
  isAdmin: boolean;
};

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [hoverSection, setHoverSection] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("sidebar-expanded");
    if (saved !== null) {
      setIsExpanded(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem("sidebar-expanded", String(newState));
  };

  const toggleSection = (module: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const visibleSections = navSections.filter((s) =>
    s.title === "Admin" ? isAdmin : true
  );
  const activeModule = moduleFromPath(pathname);
  
  useEffect(() => {
    if (isExpanded && activeModule) {
      setExpandedSections(prev => new Set(prev).add(activeModule));
    }
  }, [isExpanded, activeModule]);

  // Calculate popover position
  useEffect(() => {
    if (hoverSection) {
      const ref = sectionRefs.current.get(hoverSection);
      if (ref) {
        const rect = ref.getBoundingClientRect();
        setPopoverPosition({
          top: rect.top,
          left: isExpanded ? 256 : 64 // sidebar width (sin gap, pegado al borde)
        });
      }
    } else {
      setPopoverPosition(null);
    }
  }, [hoverSection, isExpanded]);

  const hoveredSectionData = hoverSection
    ? visibleSections.find(s => s.module === hoverSection)
    : null;

  if (!isMounted) {
    return (
      <aside className="hidden md:block relative h-full border-r border-border bg-background w-16" />
    );
  }

  return (
    <aside
      className={cn(
        "hidden md:flex relative h-full border-r border-border bg-background flex-col transition-all duration-300 ease-in-out z-[40]",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseLeave={() => setHoverSection(null)}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
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

      {/* Navigation (con scroll interno) */}
      <div className="flex-1 overflow-hidden">
        <nav className="h-full px-2 py-3 space-y-1 overflow-y-auto">
          {visibleSections.map((section) => {
            const isActiveModule = section.module === activeModule;
            const Icon = section.icon;
            const hasItems = section.items.length > 0;
            const isSectionExpanded = expandedSections.has(section.module);

            return (
              <div 
                key={section.module} 
                className="space-y-1"
                ref={(el) => {
                  if (el) sectionRefs.current.set(section.module, el);
                }}
                onMouseEnter={() => hasItems && setHoverSection(section.module)}
              >
                {/* Section Header */}
                <Link
                  href={getSectionHref(section)}
                  onClick={(e) => {
                    if (isExpanded && hasItems) {
                      toggleSection(section.module);
                    }
                  }}
                  className={cn(
                    "flex items-center h-10 rounded-lg transition-all focus-ring group",
                    isExpanded ? "px-3 justify-start" : "px-0 justify-center",
                    isActiveModule
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  title={!isExpanded ? section.title : undefined}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {isExpanded && (
                    <span className="ml-3 text-sm whitespace-nowrap flex-1">
                      {section.title}
                    </span>
                  )}
                  {isExpanded && hasItems && (
                    <ChevronRight 
                      size={16} 
                      className={cn(
                        "transition-transform",
                        isSectionExpanded && "rotate-90"
                      )}
                    />
                  )}
                </Link>

                {/* Sub-items Accordion */}
                {isExpanded && isSectionExpanded && hasItems && (
                  <div className="ml-3 pl-3 border-l-2 border-border space-y-1 mt-1">
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
      </div>

      {/* Popover (FUERA del scroll) */}
      {hoveredSectionData && popoverPosition && (
        <>
          {/* Puente invisible para mantener hover al moverse hacia el popup */}
          <div
            style={{
              position: 'fixed',
              top: `${popoverPosition.top - 4}px`,
              left: `${popoverPosition.left - 8}px`,
              width: '16px',
              height: `${Math.min(48, hoveredSectionData.items.length * 36 + 60)}px`,
            }}
            className="z-[9998]"
            onMouseEnter={() => setHoverSection(hoveredSectionData.module)}
          />
          
          {/* Popup mejorado con glass effect */}
          <div
            style={{
              position: 'fixed',
              top: `${popoverPosition.top - 4}px`,
              left: `${popoverPosition.left}px`,
              background: 'color-mix(in srgb, hsl(var(--card)) 92%, transparent)',
              backdropFilter: 'blur(16px) saturate(110%)',
              WebkitBackdropFilter: 'blur(16px) saturate(110%)',
              borderColor: 'color-mix(in srgb, hsl(var(--border)) 60%, transparent)',
              boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.15), 0 2px 8px -4px rgba(0, 0, 0, 0.08)',
            }}
            onMouseEnter={() => setHoverSection(hoveredSectionData.module)}
            onMouseLeave={() => setHoverSection(null)}
            className="rounded-r-xl border-y border-r py-3 px-2 min-w-[260px] z-[9999]"
          >
            {/* Header con icono dashboard (clicable) */}
            <Link
              href={getSectionHref(hoveredSectionData)}
              onClick={() => setHoverSection(null)}
              className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <LayoutDashboard size={16} className="text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-sm">
                {hoveredSectionData.title}
              </span>
            </Link>
            
            {/* Items */}
            <div className="space-y-0.5 px-1">
              {hoveredSectionData.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-sm rounded-lg hover:bg-secondary/80 transition-colors"
                  onClick={() => setHoverSection(null)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        aria-label={isExpanded ? "Colapsar sidebar" : "Expandir sidebar"}
        className={cn(
          "absolute -right-3 top-20 z-50 h-6 w-6 rounded-full bg-background border-2 border-border flex items-center justify-center hover:bg-secondary transition-colors focus-ring shadow-sm"
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
