import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Avoid pulling in real next-auth/Next.js runtime when importing auth helpers.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/components/ui", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
  Badge: (props: { children?: React.ReactNode }) => <span>{props.children}</span>,
  ConfirmDialog: () => null,
  Table: (props: { children?: React.ReactNode }) => <table>{props.children}</table>,
  TableShell: (props: { children?: React.ReactNode }) => <div>{props.children}</div>,
  TBody: (props: { children?: React.ReactNode }) => <tbody>{props.children}</tbody>,
  TD: (props: { children?: React.ReactNode }) => <td>{props.children}</td>,
  TH: (props: { children?: React.ReactNode }) => <th>{props.children}</th>,
  THead: (props: { children?: React.ReactNode }) => <thead>{props.children}</thead>,
  TR: (props: { children?: React.ReactNode }) => <tr>{props.children}</tr>,
}));

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { redirect } = await import("next/navigation");
const { getCurrentUser } = await import("@/modules/auth");
const mockRedirect = vi.mocked(redirect);
const mockGetCurrentUser = vi.mocked(getCurrentUser);

import TeamSettingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeamSettingsPage access control", () => {
  it("redirects unauthenticated users to /login", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(TeamSettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects non-admin authenticated users to /dashboard/settings/profile", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-broker",
      email: "broker@example.com",
      name: "Broker",
      tenantId: "t1",
      role: "BROKER",
    });

    await expect(TeamSettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/settings/profile");
  });

  it("allows ADMIN users to view the Team page", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-admin",
      email: "admin@example.com",
      name: "Admin",
      tenantId: "t1",
      role: "ADMIN",
    });

    const element = await TeamSettingsPage();
    const html = renderToStaticMarkup(element as React.ReactElement);

    expect(html).toContain("Team");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

