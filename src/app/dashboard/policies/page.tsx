import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { listPolicies } from "@/modules/policies";
import { listPoliciesQuerySchema } from "@/lib/validations/policies";
import { redirect } from "next/navigation";
import { PolicySearchForm } from "./PolicySearchForm";
import { PageHeader } from "@/components/layout";
import {
  Badge,
  ButtonLink,
  InlineState,
  ListToolbar,
  Table,
  TableShell,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { POLICY_STATUS_LABELS } from "@/lib/constants/labels";
import type { PolicyListItem } from "@/modules/policies";

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPremium(premium: unknown): string {
  if (premium == null) return "—";
  const n = Number(premium);
  return Number.isNaN(n) ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  return "neutral";
}

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
};

export default async function PoliciesPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const parsed = listPoliciesQuerySchema.safeParse({
    search: sp.search,
    status: sp.status,
    page: sp.page,
    limit: 20,
  });
  const query = parsed.success ? parsed.data : listPoliciesQuerySchema.parse({});

  const { policies, total } = await listPolicies(user.tenantId, query);
  const totalPages = Math.ceil(total / query.limit);

  return (
    <>
      <PageHeader
        title="Policies"
        description="All policies across your book. Search by policy number, customer, or insurer."
        actions={
          <ButtonLink href="/dashboard/customers" variant="secondary" size="sm">
            Customers
          </ButtonLink>
        }
      />

      <ListToolbar
        left={
          <PolicySearchForm
            initialSearch={query.search ?? ""}
            initialStatus={query.status ?? ""}
          />
        }
        right={
          <div className="text-sm text-muted-foreground">
            {total.toLocaleString()} total
          </div>
        }
      />

      <div className="mt-content-top">
        <TableShell>
          {policies.length === 0 ? (
            <InlineState
              title={query.search || query.status ? "No matches" : "No policies yet"}
              description={
                query.search || query.status ? (
                  <span>
                    Try adjusting your search or filters, or{" "}
                    <Link href="/dashboard/policies" className="text-primary hover:underline">
                      clear filters
                    </Link>
                    .
                  </span>
                ) : (
                  <span>
                    Add policies from a customer workspace to see them here.
                  </span>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH>Policy number</TH>
                  <TH>Insurer</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Premium</TH>
                  <TH>Start</TH>
                  <TH>End</TH>
                  <TH>Renewal</TH>
                  <TH>Broker</TH>
                  <TH className="min-w-[5rem] text-right">Action</TH>
                </tr>
              </THead>
              <TBody>
                {policies.map((p: PolicyListItem) => (
                  <TR key={p.id}>
                    <TD className="font-medium text-foreground">
                      <Link
                        href={`/dashboard/customers/${p.customer.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.customer.name}
                      </Link>
                    </TD>
                    <TD className="font-medium text-foreground">
                      <Link
                        href={`/dashboard/customers/${p.customer.id}/policies/${p.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.policyNumber}
                      </Link>
                    </TD>
                    <TD className="text-muted-foreground">{p.insurer.name}</TD>
                    <TD>
                      <Badge tone={statusTone(p.status)}>
                        {POLICY_STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </TD>
                    <TD className="text-right tabular-nums text-muted-foreground">
                      {formatPremium(p.premium)}
                    </TD>
                    <TD className="text-muted-foreground whitespace-nowrap">
                      {formatDate(p.startDate)}
                    </TD>
                    <TD className="text-muted-foreground whitespace-nowrap">
                      {formatDate(p.endDate)}
                    </TD>
                    <TD className="text-muted-foreground whitespace-nowrap">
                      {p.renewalDate ? formatDate(p.renewalDate) : "—"}
                    </TD>
                    <TD className="text-muted-foreground">
                      {p.customerOwner?.name ?? p.customerOwner?.email ?? "—"}
                    </TD>
                    <TD className="min-w-[5rem] text-right">
                      <Link
                        href={`/dashboard/customers/${p.customer.id}/policies/${p.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      </div>

      {totalPages > 1 && (
        <div className="mt-content-top flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {query.page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            {query.page > 1 && (
              <ButtonLink
                href={`/dashboard/policies?${new URLSearchParams({
                  ...(query.search && { search: query.search }),
                  ...(query.status && { status: query.status }),
                  page: String(query.page - 1),
                }).toString()}`}
                variant="secondary"
                size="sm"
              >
                Previous
              </ButtonLink>
            )}
            {query.page < totalPages && (
              <ButtonLink
                href={`/dashboard/policies?${new URLSearchParams({
                  ...(query.search && { search: query.search }),
                  ...(query.status && { status: query.status }),
                  page: String(query.page + 1),
                }).toString()}`}
                variant="secondary"
                size="sm"
              >
                Next
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </>
  );
}
