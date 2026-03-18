/**
 * Documents module – Phase 6.
 * File upload, storage, and document metadata; linked to customers and policies.
 */
export {
  listDocumentsByCustomerId,
  listDocumentsByPolicyId,
  listDocumentsForTenant,
  getDocumentById,
  createDocument,
  getDocumentStream,
  deleteDocument,
  type DocumentWithPolicy,
  type DocumentForList,
  type ListDocumentsForTenantFilters,
} from "./service";
