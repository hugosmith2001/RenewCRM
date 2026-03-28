import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Avoid pulling in real next-auth/Next.js runtime when importing auth helpers.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Stub UI components to avoid React global issues from their implementations.
vi.mock("@/components/ui", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
  getCurrentTenant: vi.fn(),
}));

const { redirect } = await import("next/navigation");
const { getCurrentUser, getCurrentTenant } = await import("@/modules/auth");
const mockRedirect = vi.mocked(redirect);
const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockGetCurrentTenant = vi.mocked(getCurrentTenant);

import BrokerageSettingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BrokerageSettingsPage access control", () => {
  it("redirects unauthenticated users to /login", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(BrokerageSettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockGetCurrentTenant).not.toHaveBeenCalled();
  });

  it("redirects non-admin authenticated users to /dashboard/settings/profile", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-staff",
      email: "staff@example.com",
      name: "Staff",
      tenantId: "t1",
      role: "STAFF",
    });

    await expect(BrokerageSettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/settings/profile");
    expect(mockGetCurrentTenant).not.toHaveBeenCalled();
  });

  it("allows ADMIN users to view the Brokerage page", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-admin",
      email: "admin@example.com",
      name: "Admin",
      tenantId: "t1",
      role: "ADMIN",
    });
    mockGetCurrentTenant.mockResolvedValue({
      id: "t1",
      name: "Acme Brokerage",
      slug: "acme-brokerage",
    });

    const element = await BrokerageSettingsPage();
    const html = renderToStaticMarkup(element as React.ReactElement);

    expect(html).toContain("Brokerage");
    expect(html).toContain("Acme Brokerage");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

