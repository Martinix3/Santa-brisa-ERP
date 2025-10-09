"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Search, Bell } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { navSections, moduleFromPath } from "./Sidebar";

/* ===== Types ===== */
type Breadcrumb = {
  label: string;
  href?: string;
};

/* ===== Helper Functions ===== */
function generateBreadcrumbs(pathname: string): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [];
  
  // Home
  if (pathname === "/" || pathname === "/dashboard-personal") {
    return [{ label: "Personal", href: "/dashboard-personal" }];
  }

  // Find active module
  const activeModule = moduleFromPath(pathname);
  if (!activeModule) return breadcrumbs;

  const section = navSections.find((s) => s.module === activeModule);
  if (!section) return breadcrumbs;

  // Add module as first breadcrumb
  breadcrumbs.push({
    label: section.title,
    href: section.items[0]?.href,
  });

  // Find active page
  const activePage = section.items.find((item) => pathname.startsWith(item.href));
  if (activePage && activePage.href !== section.items[0]?.href) {
    breadcrumbs.push({
      label: activePage.label,
      href: activePage.href,
    });
  }

  // Add specific resource if present (e.g., /accounts/123)
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length > 2 && activePage) {
    const resourceId = pathParts[pathParts.length - 1];
    // Only show if it's not a generic page
    if (!["dashboard", "new", "edit"].includes(resourceId)) {
      breadcrumbs.push({
        label: `#${resourceId.slice(0, 8)}`,
      });
    }
  }

  return breadcrumbs;
}

/* ===== Header Component ===== */
type HeaderProps = {
  userName?: string;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
};

export function Header({
  userName = "Usuario",
  onOpenSearch,
  onOpenNotifications,
  notificationCount = 0,
}: HeaderProps) {
  const pathname = usePathname() ?? "/";
  const breadcrumbs = generateBreadcrumbs(pathname);
  const activeModule = moduleFromPath(pathname);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center h-full px-4 gap-4">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center flex-1 min-w-0">
          <ol className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              
              return (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight
                      size={16}
                      className="text-muted-foreground mx-2 flex-shrink-0"
                    />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        "truncate",
                        isLast
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            aria-label="Buscar"
            className="hidden sm:flex h-9 px-3 items-center gap-2 rounded-md border border-input bg-background hover:bg-secondary transition-colors text-sm text-muted-foreground"
          >
            <Search size={16} />
            <span className="hidden lg:inline">Buscar...</span>
            <kbd className="hidden lg:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Mobile Search */}
          <button
            onClick={onOpenSearch}
            aria-label="Buscar"
            className="sm:hidden h-9 w-9 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
          >
            <Search size={18} />
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            aria-label="Notificaciones"
            className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
          >
            <Bell size={18} />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <div className="hidden sm:block">
            <Avatar name={userName} size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
}
