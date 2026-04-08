"use client";

import { useState } from "react";
import { signOutAction } from "@/app/login/actions";
import { Sidebar } from "./Sidebar";

type SessionUser = {
  email?: string | null;
};

type AppShellProps = {
  session: { user?: SessionUser } | null;
  children: React.ReactNode;
};

export function AppShell({ session, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-sidebar">
        <header className="fixed left-0 right-0 top-0 z-20 flex h-topbar min-h-topbar items-center justify-between border-b border-border bg-surface px-content-x lg:left-sidebar">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground lg:hidden"
            aria-label={sidebarOpen ? "Stäng meny" : "Öppna meny"}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 lg:flex-none" />
          <div className="flex shrink-0 items-center gap-4">
            {session?.user && (
              <>
                <span className="truncate text-sm text-muted-foreground">
                  {session.user.email}
                </span>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Logga ut
                  </button>
                </form>
              </>
            )}
          </div>
        </header>
        <main className="min-h-screen pt-topbar">
          <div className="p-content-y px-content-x">
            {children}
          </div>
        </main>
      </div>
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-foreground/20 lg:hidden"
          aria-label="Stäng meny"
        />
      )}
    </>
  );
}
