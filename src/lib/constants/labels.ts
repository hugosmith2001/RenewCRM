/**
 * Shared display labels for enums and statuses.
 * Single source of truth for workspace tables and filters; theme-only styling in components.
 */

export const POLICY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  PROPERTY: "Property",
  VEHICLE: "Vehicle",
  PERSON: "Person",
  BUSINESS: "Business",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  MEETING: "Meeting",
  EMAIL: "Email",
  NOTE: "Note",
  ADVICE: "Advice",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  POLICY_DOCUMENT: "Policy document",
  CONTRACT: "Contract",
  ID_DOCUMENT: "ID document",
  CORRESPONDENCE: "Correspondence",
  OTHER: "Other",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  BROKER: "Broker",
  STAFF: "Staff",
};
