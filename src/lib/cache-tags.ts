export const CACHE_REVALIDATE_SECONDS = 15;

/**
 * Cache tags must be tenant-scoped at minimum.
 * Keep tags stable and low-cardinality for targeted invalidation.
 */
export function customerTag(tenantId: string, customerId: string) {
  return `t:${tenantId}:customer:${customerId}`;
}

export function customerContactsTag(tenantId: string, customerId: string) {
  return `t:${tenantId}:customer:${customerId}:contacts`;
}

export function customerInsuredObjectsTag(tenantId: string, customerId: string) {
  return `t:${tenantId}:customer:${customerId}:insured-objects`;
}

export function customerPoliciesTag(tenantId: string, customerId: string) {
  return `t:${tenantId}:customer:${customerId}:policies`;
}

export function customerDocumentsTag(tenantId: string, customerId: string) {
  return `t:${tenantId}:customer:${customerId}:documents`;
}

export function customerActivitiesTag(tenantId: string, customerId: string) {
  return `t:${tenantId}:customer:${customerId}:activities`;
}

export function customerTasksTag(tenantId: string, customerId: string) {
  return `t:${tenantId}:customer:${customerId}:tasks`;
}

