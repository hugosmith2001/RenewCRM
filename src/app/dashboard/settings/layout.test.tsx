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

  it("shows Account nav links for any authenticated user", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      tenantId: "t1",
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

  it("shows Organization nav links for any authenticated user", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      tenantId: "t1",
    });

    const children = <div>child</div>;
    const element = await SettingsLayout({ children });

    const html = renderToStaticMarkup(element as React.ReactElement);
    expect(html).toContain("/dashboard/settings/brokerage");
    expect(html).toContain("Mäklarkontor");
    expect(html).not.toContain("/dashboard/settings/team");
    expect(html).not.toContain("Team");
  });
});

