import type { RetentionCategory } from "@prisma/client";

export type PurgeCandidateKind = "customer" | "document" | "audit_event";

export type PurgeBlockReason =
  | "legal_hold"
  | "restricted"
  | "not_expired"
  | "missing_anchor"
  | "storage_delete_failed";

export type PurgeCandidate = {
  kind: PurgeCandidateKind;
  tenantId: string;
  id: string;
  category: RetentionCategory;
  anchorAt: Date;
  eligibleAt: Date;
  blockedBy?: PurgeBlockReason;
};

export type PurgeExecutionResult = {
  attempted: number;
  deleted: number;
  blocked: number;
  failed: number;
  failures: Array<{ kind: PurgeCandidateKind; tenantId: string; id: string; reason: string }>;
};

