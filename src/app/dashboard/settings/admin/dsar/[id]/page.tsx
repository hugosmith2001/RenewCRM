import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { getDsarRequestById, getDsarExportByRequestId } from "@/modules/dsar";
import { PageHeader, DetailSection, sectionInnerGapClass, sectionListClasses, sectionListItemClasses } from "@/components/layout";
import { Badge, ButtonLink } from "@/components/ui";
import { Role } from "@prisma/client";
import { DsarActions } from "./DsarActions";

type Params = { params: Promise<{ id: string }> };

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

function subjectLink(subjectType: string, subjectRefId: string): { href: string; label: string } | null {
  if (subjectType === "CUSTOMER") {
    return { href: `/dashboard/customers/${subjectRefId}`, label: "Open customer" };
  }
  return null;
}

export default async function DsarAdminDetailPage({ params }: Params) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== Role.ADMIN) redirect("/dashboard");

  const { id } = await params;
  const req = await getDsarRequestById(user, id);
  if (!req) redirect("/dashboard/settings/admin/dsar");

  const exp = req.requestType === "EXPORT" ? await getDsarExportByRequestId(user, req.id) : null;
  const subLink = subjectLink(req.subjectType, req.subjectRefId);

  return (
    <>
      <PageHeader
        title={`DSAR ${req.id}`}
        description="Review and execute DSAR actions. Notes should remain operational only (no personal data)."
      />

      <div className={sectionInnerGapClass}>
        <DetailSection title="Request">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-1">
                <Badge tone={statusTone(req.status)}>{req.status}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
              <p className="mt-1 font-medium text-foreground">{req.requestType}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
              <p className="mt-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {req.subjectType}
                </span>
                <span className="text-muted-foreground"> · </span>
                <span className="font-mono text-xs">{req.subjectRefId}</span>
              </p>
              {subLink ? (
                <Link href={subLink.href} className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                  {subLink.label} →
                </Link>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</p>
              <p className="mt-1 text-muted-foreground">{formatDateTime(req.createdAt)}</p>
            </div>
          </div>
        </DetailSection>

        <DetailSection title="Operator guidance">
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Verify requester identity before approval.</li>
            <li>Confirm retention/legal hold rules before erasure or anonymization.</li>
            <li>Export includes free-text and related records where present.</li>
            <li>Audit trail is recorded automatically (IDs only).</li>
          </ul>
        </DetailSection>

        <DetailSection title="Actions">
          <DsarActions
            id={req.id}
            requestType={req.requestType}
            status={req.status}
            subjectType={req.subjectType}
            subjectRefId={req.subjectRefId}
          />
        </DetailSection>

        {req.requestType === "EXPORT" ? (
          <DetailSection title="Export">
            {exp ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge tone={exp.status === "COMPLETED" ? "success" : exp.status === "FAILED" ? "danger" : "info"}>
                    {exp.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Format v{exp.formatVersion} · Files bundled: {exp.includeFiles ? "yes" : "no"}
                  </p>
                </div>
                {exp.status === "FAILED" ? (
                  <p className="text-sm text-muted-foreground">Error: {exp.error ?? "Unknown error"}</p>
                ) : null}
                {exp.status === "COMPLETED" ? (
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink
                      href={`/api/admin/dsar/${req.id}/export/download?format=json`}
                      variant="secondary"
                      size="sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download JSON
                    </ButtonLink>
                    {exp.exportCsv && typeof exp.exportCsv === "object" ? (
                      Object.keys(exp.exportCsv as Record<string, string>).map((file) => (
                        <ButtonLink
                          key={file}
                          href={`/api/admin/dsar/${req.id}/export/download?format=csv&file=${encodeURIComponent(file)}`}
                          variant="secondary"
                          size="sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {file}
                        </ButtonLink>
                      ))
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No export artifact yet. Approve the request, then run Export.
              </p>
            )}
          </DetailSection>
        ) : null}

        <DetailSection title="History">
          {req.actions.length > 0 ? (
            <ul className={sectionListClasses}>
              {req.actions.map((a) => (
                <li key={a.id} className={sectionListItemClasses}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {a.actionType}
                        {a.toStatus ? (
                          <span className="text-muted-foreground">
                            {" "}
                            → <span className="font-mono text-xs">{a.toStatus}</span>
                          </span>
                        ) : null}
                      </p>
                      {a.note ? <p className="mt-0.5 text-sm text-muted-foreground">{a.note}</p> : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Operator: <span className="font-mono">{a.operatorUserId}</span>
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(a.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No history entries yet.</p>
          )}
        </DetailSection>

        <div>
          <Link href="/dashboard/settings/admin/dsar" className="text-sm font-medium text-primary hover:underline">
            ← Back to DSAR list
          </Link>
        </div>
      </div>
    </>
  );
}

