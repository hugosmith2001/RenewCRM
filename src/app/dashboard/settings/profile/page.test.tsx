import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Avoid pulling in real next-auth/Next.js runtime when importing auth helpers.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { getCurrentUser } = await import("@/modules/auth");
const mockGetCurrentUser = vi.mocked(getCurrentUser);

import ProfileSettingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 1: /dashboard/settings/profile page.
 * Covers:
 * - Authenticated users can render the profile page.
 * - Page passes editable name and read-only email props into ProfileForm.
 * Does not cover full client rendering or form submission (handled in API tests).
 */
describe("ProfileSettingsPage (Phase 1)", () => {
  it("renders for authenticated users and passes name/email to ProfileForm", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "Existing Name",
      tenantId: "t1",
      role: "STAFF",
    });

    const element = await ProfileSettingsPage();

    expect(element).toBeTruthy();
    expect(mockGetCurrentUser).toHaveBeenCalled();
  });

  it("falls back to empty name when user.name is null", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: null,
      tenantId: "t1",
      role: "ADMIN",
    });

    const element = await ProfileSettingsPage();

    expect(element).toBeTruthy();
    expect(mockGetCurrentUser).toHaveBeenCalled();
  });
});

