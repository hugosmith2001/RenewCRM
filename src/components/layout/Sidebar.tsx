"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems: { label: string; href: string; badge?: string }[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Customers", href: "/dashboard/customers" },
  { label: "Renewals", href: "/dashboard/renewals", badge: "Queue" },
  { label: "Policies", href: "/dashboard/policies" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Activities", href: "/dashboard/activities" },
  { label: "Documents", href: "/dashboard/documents" },
  { label: "Settings", href: "/dashboard/settings" },
];

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen w-sidebar min-w-sidebar flex-col border-r border-border bg-surface transition-transform duration-200 ease-out lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-topbar min-h-topbar items-center border-b border-border px-content-x">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-foreground no-underline"
        >
          Safekeep CRM
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-content-x" role="list">
          {navItems.map(({ label, href, badge }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={`flex items-center justify-between gap-2 border-l-2 px-3 py-2 text-sm no-underline transition-colors ${
                    isActive
                      ? "border-sidebar-active-border bg-sidebar-active-bg font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <span>{label}</span>
                  {badge && (
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
