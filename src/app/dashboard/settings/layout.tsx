import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { Role } from "@prisma/client";

type SettingsLayoutProps = {
  children: React.ReactNode;
};

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.role === Role.ADMIN;

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your account{isAdmin ? " and organization" : ""}.
            </p>
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Account
            </span>
            <Link
              href="/dashboard/settings/profile"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
            <Link
              href="/dashboard/settings/password"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Password
            </Link>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Organization
              </span>
              <Link
                href="/dashboard/settings/brokerage"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Brokerage
              </Link>
              <Link
                href="/dashboard/settings/team"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Team
              </Link>
            </div>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}

