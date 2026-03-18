import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const { redirect } = await import("next/navigation");
const mockRedirect = vi.mocked(redirect);

import SettingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Settings index route (Phase 0)", () => {
  it("redirects to /dashboard/settings/profile for any access", async () => {
    await SettingsPage();
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/settings/profile");
  });
});

