"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  Megaphone,
  Factory,
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navSections, moduleFromPath, dashboardHrefFor } from "./Sidebar";
import { MODULE_ACCENTS } from "@/domain/ssot";

/* ===== Bottom Navigation Component (Mobile Only) ===== */
type BottomNavProps = {
  isAdmin: boolean;
};

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname() ?? "/";
  const activeModule = moduleFromPath(pathname);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Primary sections (always visible in bottom nav)
  const primaryModules: (keyof typeof MODULE_ACCENTS)[] = [
    "personal",
    "sales",
    "marketing",
    "production",
  ];

  // Secondary sections (in "More" menu)
  const secondaryModules = navSections.filter((s) => {
    if (!primaryModules.includes(s.module)) {
      return s.title === "Admin" ? isAdmin : true;
    }
    return false;
  });

  const primarySections = navSections.filter((s) =>
    primaryModules.includes(s.module)
  );

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border safe-area-inset-bottom"
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="flex items-center justify-around h-full px-2">
          {primarySections.map((section) => {
            const Icon = section.icon;
            const isActive = section.module === activeModule;
            const href = dashboardHrefFor(section.module);

            return (
              <Link
                key={section.module}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:bg-secondary"
                )}
                aria-label={section.title}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} className="mb-1" />
                <span className="text-[10px] font-medium leading-none">
                  {section.title}
                </span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full rounded-lg transition-colors",
              "text-muted-foreground active:bg-secondary"
            )}
            aria-label="Más opciones"
            aria-haspopup="true"
            aria-expanded={moreMenuOpen}
          >
            <MoreHorizontal size={20} className="mb-1" />
            <span className="text-[10px] font-medium leading-none">Más</span>
          </button>
        </div>
      </nav>

      {/* More Menu Modal (Slide Up) */}
      {moreMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
            onClick={() => setMoreMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Content */}
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-lg animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-label="Más opciones"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 rounded-full bg-muted" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 border-b">
              <h2 className="text-lg font-semibold">Más opciones</h2>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 py-3 space-y-1 max-h-[60vh] overflow-y-auto pb-safe">
              {secondaryModules.map((section) => {
                const Icon = section.icon;
                const isActive = section.module === activeModule;
                const href = dashboardHrefFor(section.module);

                return (
                  <Link
                    key={section.module}
                    href={href}
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary active:bg-secondary"
                    )}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span className="text-sm">{section.title}</span>
                  </Link>
                );
              })}
            </div>

            {/* Safe area spacing */}
            <div className="h-safe-area-inset-bottom" />
          </div>
        </>
      )}
    </>
  );
}
