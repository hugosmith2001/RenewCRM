/**
 * Policies module – Phase 5.
 * Policy and insurer CRUD; policies linked to customers and insured objects.
 */
export {
  listInsurers,
  getInsurerById,
  createInsurer,
  updateInsurer,
  deleteInsurer,
  listPoliciesByCustomerId,
  listPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  type PolicyWithInsurerAndObjects,
  type PolicyListItem,
} from "./service";
