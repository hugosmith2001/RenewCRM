/**
 * Activities module – Phase 7.
 * Activity CRUD (call, meeting, email, note, advice) scoped by customer and tenant.
 */
export {
  listActivitiesByCustomerId,
  listActivitiesForTenant,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  type ActivityWithCreator,
  type ActivityForFeed,
  type ListActivitiesForTenantFilters,
} from "./service";
