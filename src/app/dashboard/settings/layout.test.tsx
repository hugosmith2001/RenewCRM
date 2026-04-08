import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  // Simulate Next.js redirect, which throws to short-circuit rendering.
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  // Other exports not needed for these tests.
}));

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { redirect } = await import("next/navigation");
const { getCurrentUser } = await import("@/modules/auth");
const mockRedirect = vi.mocked(redirect);
const mockGetCurrentUser = vi.mocked(getCurrentUser);

import SettingsLayout from "./layout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SettingsLayout (Phase 0)", () => {
  it("redirects unauthenticated users to /login", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const children = <div>child</div>;

    await expect(SettingsLayout({ children })).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("shows Account nav links for any authenticated role", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      tenantId: "t1",
      role: "STAFF",
    });

    const children = <div>child</div>;
    const element = await SettingsLayout({ children });

    const html = renderToStaticMarkup(element as React.ReactElement);
    expect(html).toContain("/dashboard/settings/profile");
    expect(html).toContain("Profil");
    expect(html).toContain("/dashboard/settings/password");
    expect(html).toContain("Lösenord");
    expect(html).toContain("/dashboard/settings/privacy");
    expect(html).toContain("Integritet &amp; regelefterlevnad");
  });

  it("shows Organization nav links only for ADMIN", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-admin",
      email: "admin@example.com",
      name: "Admin",
      tenantId: "t1",
      role: "ADMIN",
    });

    const children = <div>child</div>;
    const element = await SettingsLayout({ children });

    const html = renderToStaticMarkup(element as React.ReactElement);
    expect(html).toContain("/dashboard/settings/brokerage");
    expect(html).toContain("Mäklarkontor");
    expect(html).not.toContain("/dashboard/settings/team");
    expect(html).not.toContain("Team");
  });

  it("does not show Organization nav links for BROKER", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-broker",
      email: "broker@example.com",
      name: "Broker",
      tenantId: "t1",
      role: "BROKER",
    });

    const children = <div>child</div>;
    const element = await SettingsLayout({ children });

    const html = renderToStaticMarkup(element as React.ReactElement);
    expect(html).not.toContain("/dashboard/settings/brokerage");
    expect(html).not.toContain("Mäklarkontor");
    expect(html).not.toContain("/dashboard/settings/team");
    expect(html).not.toContain("Team");
  });

  it("does not show Organization nav links for STAFF", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-staff",
      email: "staff@example.com",
      name: "Staff",
      tenantId: "t1",
      role: "STAFF",
    });

    const children = <div>child</div>;
    const element = await SettingsLayout({ children });

    const html = renderToStaticMarkup(element as React.ReactElement);
    expect(html).not.toContain("/dashboard/settings/brokerage");
    expect(html).not.toContain("Mäklarkontor");
    expect(html).not.toContain("/dashboard/settings/team");
    expect(html).not.toContain("Team");
  });
});

