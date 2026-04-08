/**
 * Shared display labels for enums and statuses.
 * Single source of truth for workspace tables and filters; theme-only styling in components.
 */

export const POLICY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  PENDING: "Pågående",
  EXPIRED: "Utgången",
  CANCELLED: "Avbruten",
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  PROPERTY: "Fastighet",
  VEHICLE: "Fordon",
  PERSON: "Person",
  BUSINESS: "Företag",
  EQUIPMENT: "Utrustning",
  OTHER: "Annat",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Låg",
  MEDIUM: "Medel",
  HIGH: "Hög",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pågående",
  IN_PROGRESS: "Pågår",
  DONE: "Klar",
  CANCELLED: "Avbruten",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Samtal",
  MEETING: "Möte",
  EMAIL: "E-post",
  NOTE: "Anteckning",
  ADVICE: "Rådgivning",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  POLICY_DOCUMENT: "Försäkringsdokument",
  CONTRACT: "Avtal",
  ID_DOCUMENT: "ID-handling",
  CORRESPONDENCE: "Korrespondens",
  OTHER: "Annat",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  BROKER: "Mäklare",
  STAFF: "Personal",
};
