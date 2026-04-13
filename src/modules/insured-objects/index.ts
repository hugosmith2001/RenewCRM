/**
 * Insured objects module – Phase 4.
 * CRUD for insured objects (property, vehicle, person, business, equipment).
 */
export {
  listInsuredObjectsByCustomerId,
  listInsuredObjectsByCustomerIdCached,
  getInsuredObjectById,
  createInsuredObject,
  updateInsuredObject,
  deleteInsuredObject,
} from "./service";
