import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";

type SettingsLayoutProps = {
  children: React.ReactNode;
};

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Inställningar
            </h1>
            <p className="text-sm text-muted-foreground">
              Hantera ditt konto och din organisation.
            </p>
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Konto
            </span>
            <Link
              href="/dashboard/settings/profile"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Profil
            </Link>
            <Link
              href="/dashboard/settings/password"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Lösenord
            </Link>
            <Link
              href="/dashboard/settings/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Integritet &amp; regelefterlevnad
            </Link>
          </div>
          {user.role === "ADMIN" ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Organisation
              </span>
              <Link
                href="/dashboard/settings/brokerage"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Mäklarkontor
              </Link>
            </div>
          ) : null}
        </nav>
      </header>
      {children}
    </div>
  );
}

