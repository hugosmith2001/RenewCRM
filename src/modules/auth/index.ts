/**
 * Auth module – Phase 1.
 * Session, current user/tenant, and backend authorization helpers.
 */
export {
  getCurrentUser,
  getCurrentTenant,
  requireAuth,
  assertTenantAccess,
  listTenantUsers,
  type SessionUser,
} from "./session";
