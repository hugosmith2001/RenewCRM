import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { listPolicies } from "@/modules/policies";
import { listPoliciesQuerySchema } from "@/lib/validations/policies";
import { redirect } from "next/navigation";
import { PolicySearchForm } from "./PolicySearchForm";
import { AddPolicyMenu } from "./AddPolicyMenu";
import { PageHeader } from "@/components/layout";
import {
  Badge,
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
        title="Försäkringar"
        description="Alla försäkringar i ditt bestånd. Sök på försäkringsnummer, kund eller försäkringsbolag."
        actions={
          <AddPolicyMenu />
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
              title={query.search || query.status ? "Inga träffar" : "Inga försäkringar ännu"}
              description={
                query.search || query.status ? (
                  <span>
                    Prova att justera din sökning eller dina filter, eller{" "}
                    <Link href="/dashboard/policies" className="text-primary hover:underline">
                      rensa filter
                    </Link>
                    .
                  </span>
                ) : (
                  <span>
                    Lägg till försäkringar från en kundsida för att se dem här.
                  </span>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Kund</TH>
                  <TH>Försäkringsnummer</TH>
                  <TH>Försäkringsbolag</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Premie</TH>
                  <TH>Start</TH>
                  <TH>Slut</TH>
                  <TH>Förnyelse</TH>
                  <TH>Mäklare</TH>
                  <TH className="min-w-[5rem] text-right">Åtgärd</TH>
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
                        Visa
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
            Sida {query.page} av {totalPages} ({total} totalt)
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
                Föregående
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
                Nästa
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </>
  );
}
