"use client";

import { useMemo, useState } from "react";
import { Button, ConfirmDialog } from "@/components/ui";

type DsarStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "REJECTED";
type DsarRequestType = "EXPORT" | "ERASE" | "RESTRICT";

type Props = {
  id: string;
  requestType: DsarRequestType;
  status: DsarStatus;
  subjectType: string;
  subjectRefId: string;
};

async function apiJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && typeof data === "object" && "error" in data && typeof (data as any).error === "string")
      ? (data as any).error
      : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export function DsarActions({ id, requestType, status, subjectType, subjectRefId }: Props) {
  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "primary";
    run: () => Promise<void>;
  }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = useMemo(() => {
    return {
      toInReview: status === "PENDING",
      approve: status === "IN_REVIEW",
      reject: status === "PENDING" || status === "IN_REVIEW" || status === "FAILED",
      export: requestType === "EXPORT" && status === "APPROVED",
      restrict: requestType === "RESTRICT" && status === "APPROVED",
      erase: requestType === "ERASE" && status === "APPROVED",
      markFailed: status === "PROCESSING",
      retryProcessing: status === "FAILED",
    };
  }, [requestType, status]);

  async function runAction(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  function confirmAction(cfg: Omit<NonNullable<typeof confirm>, "run"> & { run: () => Promise<void> }) {
    setConfirm(cfg);
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-foreground">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!allowed.toInReview || loading}
          onClick={() => runAction(() => apiJson(`/api/admin/dsar/${id}`, { method: "PATCH", body: JSON.stringify({ status: "IN_REVIEW" }) }))}
        >
          Move to review
        </Button>

        <Button
          size="sm"
          variant="primary"
          disabled={!allowed.approve || loading}
          onClick={() => runAction(() => apiJson(`/api/admin/dsar/${id}`, { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) }))}
        >
          Approve
        </Button>

        <Button
          size="sm"
          variant="danger"
          disabled={!allowed.reject || loading}
          onClick={() =>
            confirmAction({
              title: "Reject DSAR request?",
              message: "This ends the request. Use notes to record the operational reason (no personal data).",
              confirmLabel: "Reject",
              variant: "danger",
              run: async () =>
                apiJson(`/api/admin/dsar/${id}`, { method: "PATCH", body: JSON.stringify({ status: "REJECTED" }) }),
            })
          }
        >
          Reject
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={!allowed.export || loading}
          onClick={() =>
            confirmAction({
              title: "Generate export now?",
              message:
                "Export includes free-text fields and related records. Audit trail is recorded automatically. Continue?",
              confirmLabel: "Generate export",
              variant: "primary",
              run: async () => apiJson(`/api/admin/dsar/${id}/export`, { method: "POST" }),
            })
          }
        >
          Export
        </Button>

        <Button
          size="sm"
          variant="primary"
          disabled={!allowed.restrict || loading}
          onClick={() =>
            confirmAction({
              title: "Apply restriction of processing?",
              message:
                "This flags the subject as restricted (Art. 18). Non-admin access should be blocked. Confirm retention/legal hold rules first.",
              confirmLabel: "Restrict",
              variant: "primary",
              run: async () => apiJson(`/api/admin/dsar/${id}/restrict`, { method: "POST", body: JSON.stringify({ reason: "DSAR restriction" }) }),
            })
          }
        >
          Restrict
        </Button>

        <Button
          size="sm"
          variant="danger"
          disabled={!allowed.erase || loading}
          onClick={() =>
            confirmAction({
              title: "Execute erasure/anonymization?",
              message:
                `This is destructive. Confirm identity verification, retention/legal hold, and scope. Subject: ${subjectType} ${subjectRefId}.`,
              confirmLabel: "Erase / anonymize",
              variant: "danger",
              run: async () => apiJson(`/api/admin/dsar/${id}/erase`, { method: "POST", body: JSON.stringify({ reason: "DSAR erasure/anonymization" }) }),
            })
          }
        >
          Erase / anonymize
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="danger"
          disabled={!allowed.markFailed || loading}
          onClick={() =>
            confirmAction({
              title: "Mark as failed?",
              message: "Use this only if the execution step failed and requires investigation.",
              confirmLabel: "Mark failed",
              variant: "danger",
              run: async () => apiJson(`/api/admin/dsar/${id}`, { method: "PATCH", body: JSON.stringify({ status: "FAILED" }) }),
            })
          }
        >
          Mark failed
        </Button>

        <Button
          size="sm"
          variant="secondary"
          disabled={!allowed.retryProcessing || loading}
          onClick={() => runAction(() => apiJson(`/api/admin/dsar/${id}`, { method: "PATCH", body: JSON.stringify({ status: "PROCESSING" }) }))}
        >
          Retry processing
        </Button>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant}
        loading={loading}
        onCancel={() => (loading ? null : setConfirm(null))}
        onConfirm={async () => {
          if (!confirm) return;
          setConfirm(null);
          await runAction(confirm.run);
        }}
      />
    </div>
  );
}

