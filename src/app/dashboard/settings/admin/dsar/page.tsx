import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { listDsarRequests } from "@/modules/dsar";
import { PageHeader } from "@/components/layout";
import { Badge, TableShell, Table, THead, TH, TBody, TR, TD } from "@/components/ui";
import { Role } from "@prisma/client";

function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "APPROVED":
    case "IN_REVIEW":
    case "PROCESSING":
      return "info";
    case "FAILED":
      return "danger";
    case "REJECTED":
      return "neutral";
    case "PENDING":
    default:
      return "warning";
  }
}

export default async function DsarAdminListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== Role.ADMIN) redirect("/dashboard");

  const { requests } = await listDsarRequests(user, { page: 1, limit: 50 });

  return (
    <>
      <PageHeader
        title="DSAR requests"
        description="Admin-only operational workflow for access/export, restriction, and erasure."
      />

      <div className="mt-4 rounded-card border border-border bg-surface p-section-body">
        <p className="text-sm text-muted-foreground">
          Verify requester identity before approval. Confirm retention/legal hold rules before erasure. Audit trail is recorded automatically.
        </p>
      </div>

      <TableShell className="mt-4">
        <Table>
          <THead>
            <tr>
              <TH>Created</TH>
              <TH>Type</TH>
              <TH>Subject</TH>
              <TH>Status</TH>
              <TH className="text-right">Open</TH>
            </tr>
          </THead>
          <TBody>
            {requests.length > 0 ? (
              requests.map((r) => (
                <TR key={r.id}>
                  <TD className="text-muted-foreground">{formatDateTime(r.createdAt)}</TD>
                  <TD>{r.requestType}</TD>
                  <TD title={r.subjectRefId} className="max-w-[420px] truncate">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {r.subjectType}
                    </span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="font-mono text-xs">{r.subjectRefId}</span>
                  </TD>
                  <TD>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/dashboard/settings/admin/dsar/${r.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Review
                    </Link>
                  </TD>
                </TR>
              ))
            ) : (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No DSAR requests yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </TableShell>
    </>
  );
}

