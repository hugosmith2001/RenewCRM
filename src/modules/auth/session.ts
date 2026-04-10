/**
 * Current user and tenant helpers.
 * Use in Server Components, API routes, and Server Actions.
 */
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  tenantId: string;
  role: Role | null;
};

/**
 * Returns the current session user from the JWT (no DB lookup).
 * Use when you only need id, email, tenantId, role.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) {
    return null;
  }

  const rawRole = (session.user as { role?: unknown }).role;
  const role =
    typeof rawRole === "string" && (Object.values(Role) as string[]).includes(rawRole)
      ? (rawRole as Role)
      : null;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    tenantId: session.user.tenantId,
    role,
  };
}

/**
 * Returns the current tenant from DB (includes full tenant record).
 * Use when you need tenant name/slug or to enforce tenant exists.
 */
export async function getCurrentTenant() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.tenant.findUnique({
    where: { id: user.tenantId },
  });
}

/**
 * Throws if not authenticated. Returns the current session user.
 * Use at the start of API routes or server actions that require auth.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Throws if not authenticated or role is not in allowed list.
 * Use for admin-only settings and privileged API routes.
 */
export async function requireRole(allowed: Role | Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  const allowList = Array.isArray(allowed) ? allowed : [allowed];
  if (!user.role || !allowList.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

/**
 * Ensures the resource's tenantId matches the current user's tenant.
 * Call after requireAuth() when operating on tenant-scoped resources.
 */
export function assertTenantAccess(user: SessionUser, resourceTenantId: string): void {
  if (user.tenantId !== resourceTenantId) {
    throw new Error("Forbidden");
  }
}

/** List users in a tenant (e.g. for broker/assignee dropdowns). */
export async function listTenantUsers(tenantId: string): Promise<{ id: string; name: string | null; email: string }[]> {
  return prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
