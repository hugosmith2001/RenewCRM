import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { getCurrentUser } = await import("@/modules/auth");
const mockGetCurrentUser = vi.mocked(getCurrentUser);

import PrivacySettingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PrivacySettingsPage", () => {
  it("renders for authenticated users", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      tenantId: "t1",
    });

    const element = await PrivacySettingsPage();
    const html = renderToStaticMarkup(element as React.ReactElement);

    expect(html).toContain("Integritetspolicy");
    expect(html).toContain("Cookies");
    expect(mockGetCurrentUser).toHaveBeenCalled();
  });
});

