import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { redirect } = await import("next/navigation");
const { getCurrentUser } = await import("@/modules/auth");
const mockRedirect = vi.mocked(redirect);
const mockGetCurrentUser = vi.mocked(getCurrentUser);

import DataProcessingSettingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DataProcessingSettingsPage access control", () => {
  it("redirects unauthenticated users to /login", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(DataProcessingSettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects non-admin authenticated users to /dashboard/settings/privacy", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-staff",
      email: "staff@example.com",
      name: "Staff",
      tenantId: "t1",
      role: "STAFF",
    });

    await expect(DataProcessingSettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/settings/privacy");
  });

  it("allows ADMIN users to view the page", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-admin",
      email: "admin@example.com",
      name: "Admin",
      tenantId: "t1",
      role: "ADMIN",
    });

    const element = await DataProcessingSettingsPage();
    const html = renderToStaticMarkup(element as React.ReactElement);

    expect(html).toContain("Data processing overview");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

