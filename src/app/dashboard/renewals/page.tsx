import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { listRenewalsBucketed } from "@/modules/renewals";
import { redirect } from "next/navigation";
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
import type { RenewalItem } from "@/modules/renewals";
import { RenewalsFilterForm } from "./RenewalsFilterForm";
import { PolicyStatus } from "@prisma/client";

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  return "neutral";
}

function isPolicyStatus(value: string): value is PolicyStatus {
  return (Object.values(PolicyStatus) as string[]).includes(value);
}

function RenewalsSection({
  title,
  count,
  items,
  emptyMessage,
}: {
  title: string;
  count: number;
  items: RenewalItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <section className="mb-section-gap" aria-labelledby={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}>
        <h2 id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`} className="mb-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title} ({count})
        </h2>
        <div className="rounded-card border border-border bg-surface p-section-body">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-section-gap" aria-labelledby={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <h2 id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`} className="mb-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title} ({items.length})
      </h2>
      <TableShell>
        <Table>
          <THead>
            <tr>
              <TH>Kund</TH>
              <TH>Försäkringsnummer</TH>
              <TH>Försäkringsbolag</TH>
              <TH>Status</TH>
              <TH>Förnyelsedatum</TH>
              <TH className="min-w-[5rem] text-right">Åtgärd</TH>
            </tr>
          </THead>
          <TBody>
            {items.map((item) => (
              <TR key={item.id}>
                <TD className="font-medium text-foreground">
                  <Link
                    href={`/dashboard/customers/${item.customerId}`}
                    className="text-primary hover:underline"
                  >
                    {item.customerName}
                  </Link>
                </TD>
                <TD className="font-mono text-foreground">
                  <Link
                    href={`/dashboard/customers/${item.customerId}/policies/${item.id}`}
                    className="text-primary hover:underline"
                  >
                    {item.policyNumber}
                  </Link>
                </TD>
                <TD className="text-muted-foreground">{item.insurerName}</TD>
                <TD>
                  <Badge tone={statusTone(item.status)}>
                    {POLICY_STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </TD>
                <TD className="whitespace-nowrap text-muted-foreground">
                  {item.renewalDate ? formatDate(item.renewalDate) : "—"}
                </TD>
                <TD className="min-w-[5rem] text-right">
                  <Link
                    href={`/dashboard/customers/${item.customerId}/policies/${item.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Visa
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableShell>
    </section>
  );
}

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function RenewalsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const status = sp.status ?? "";
  const statusFilter = isPolicyStatus(status) ? status : undefined;

  const buckets = await listRenewalsBucketed(user.tenantId, {
    status: statusFilter,
  });

  const totalWithDate =
    buckets.overdue.length +
    buckets.next7.length +
    buckets.next30.length +
    buckets.next90.length +
    buckets.later.length;
  const totalMissing = buckets.missingDate.length;
  const total = totalWithDate + totalMissing;

  return (
    <>
      <PageHeader
        title="Förnyelser"
        description="Din förnyelsekö. Filtrera på status och ange förnyelsedatum på kundsidan."
        actions={
          <ButtonLink href="/dashboard/customers" variant="secondary" size="sm">
            Kunder
          </ButtonLink>
        }
      />

      <ListToolbar
        left={<RenewalsFilterForm initialStatus={status} />}
        right={
          <span className="text-sm text-muted-foreground">
            {total} totalt
            {totalMissing > 0 && ` (${totalMissing} saknar datum)`}
          </span>
        }
      />

      {total === 0 ? (
        <div className="mt-content-top">
          <TableShell>
            <InlineState
              title="Inga försäkringar matchar"
              description={
                status
                  ? "Prova att rensa filtren, eller lägg till försäkringar och ange förnyelsedatum på kundsidan."
                  : "Lägg till försäkringar och ange förnyelsedatum på kundsidan för att se dem här."
              }
              primaryAction={{
                label: "Visa kunder",
                href: "/dashboard/customers",
              }}
            />
          </TableShell>
        </div>
      ) : (
        <div className="mt-content-top space-y-0">
          {buckets.overdue.length > 0 && (
            <RenewalsSection
              title="Försenade"
              count={buckets.overdue.length}
              items={buckets.overdue}
              emptyMessage="Inga försenade förnyelser."
            />
          )}
          {buckets.next7.length > 0 && (
            <RenewalsSection
              title="Kommande 7 dagar"
              count={buckets.next7.length}
              items={buckets.next7}
              emptyMessage="Inget som förfaller inom de kommande 7 dagarna."
            />
          )}
          {buckets.next30.length > 0 && (
            <RenewalsSection
              title="Kommande 30 dagar"
              count={buckets.next30.length}
              items={buckets.next30}
              emptyMessage="Inget som förfaller inom de kommande 30 dagarna."
            />
          )}
          {buckets.next90.length > 0 && (
            <RenewalsSection
              title="Kommande 90 dagar"
              count={buckets.next90.length}
              items={buckets.next90}
              emptyMessage="Inget som förfaller inom de kommande 90 dagarna."
            />
          )}
          {buckets.later.length > 0 && (
            <RenewalsSection
              title="Senare"
              count={buckets.later.length}
              items={buckets.later}
              emptyMessage="Inget som förfaller senare än 90 dagar."
            />
          )}
          {buckets.missingDate.length > 0 && (
            <RenewalsSection
              title="Saknar förnyelsedatum"
              count={buckets.missingDate.length}
              items={buckets.missingDate}
              emptyMessage="Inga försäkringar utan förnyelsedatum."
            />
          )}
        </div>
      )}
    </>
  );
}
