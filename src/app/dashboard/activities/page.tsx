import Link from "next/link";
import { getCurrentUser, listTenantUsers } from "@/modules/auth";
import { listActivitiesForTenant, type ActivityForFeed } from "@/modules/activities";
import { listActivitiesQuerySchema } from "@/lib/validations/activities";
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
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants/labels";
import { ActivityFilters } from "./ActivityFilters";

type Props = {
  searchParams: Promise<{ type?: string; broker?: string; range?: string; page?: string }>;
};

function getDateRange(range: "7d" | "30d" | undefined): { from?: Date; to?: Date } {
  if (!range) return {};
  const to = new Date();
  const from = new Date();
  if (range === "7d") from.setDate(from.getDate() - 7);
  else if (range === "30d") from.setDate(from.getDate() - 30);
  return { from, to };
}

export default async function ActivitiesPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const parsed = listActivitiesQuerySchema.safeParse({
    type: sp.type,
    broker: sp.broker,
    range: sp.range,
    page: sp.page,
    limit: 50,
  });
  const query = parsed.success ? parsed.data : listActivitiesQuerySchema.parse({});
  const { from, to } = getDateRange(query.range);
  const offset = (query.page - 1) * query.limit;

  const [users, { activities, total }] = await Promise.all([
    listTenantUsers(user.tenantId),
    listActivitiesForTenant(user.tenantId, {
      type: query.type,
      createdById: query.broker,
      from,
      to,
      limit: query.limit,
      offset,
      viewerRole: user.role,
    }),
  ]);

  const totalPages = Math.ceil(total / query.limit);
  const hasFilters = !!(query.type || query.broker || query.range);

  return (
    <>
      <PageHeader
        title="Activities"
        description="Recent activity across all customers. Calls, meetings, emails, notes, and advice."
        actions={
          <ButtonLink href="/dashboard" variant="secondary" size="sm">
            Back to dashboard
          </ButtonLink>
        }
      />

      <ListToolbar
        left={
          <ActivityFilters
            users={users}
            initialType={query.type ?? ""}
            initialBroker={query.broker ?? ""}
            initialRange={query.range ?? ""}
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
          {activities.length === 0 ? (
            <InlineState
              title={hasFilters ? "No matches" : "No activities yet"}
              description={
                hasFilters ? (
                  <span>
                    Try adjusting filters, or{" "}
                    <Link href="/dashboard/activities" className="text-primary hover:underline">
                      clear filters
                    </Link>
                    .
                  </span>
                ) : (
                  <span>
                    Activities are logged on customer pages.{" "}
                    <Link href="/dashboard/customers" className="text-primary hover:underline">
                      Open a customer
                    </Link>{" "}
                    to log calls, meetings, emails, or notes.
                  </span>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH className="w-[10%]">Type</TH>
                  <TH className="w-[24%]">Title</TH>
                  <TH className="w-[20%]">Customer</TH>
                  <TH className="w-[18%]">Created by</TH>
                  <TH className="w-[18%]">Created</TH>
                  <TH className="text-right w-[10%]">Action</TH>
                </tr>
              </THead>
              <TBody>
                {activities.map((a) => (
                  <ActivityRow key={a.id} activity={a} />
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
                href={`/dashboard/activities?${new URLSearchParams({
                  ...(query.type && { type: query.type }),
                  ...(query.broker && { broker: query.broker }),
                  ...(query.range && { range: query.range }),
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
                href={`/dashboard/activities?${new URLSearchParams({
                  ...(query.type && { type: query.type }),
                  ...(query.broker && { broker: query.broker }),
                  ...(query.range && { range: query.range }),
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

function ActivityRow({ activity }: { activity: ActivityForFeed }) {
  const created = new Date(activity.createdAt).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <TR>
      <TD>
        <Badge tone="neutral">
          {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
        </Badge>
      </TD>
      <TD className="font-medium text-foreground max-w-[200px] truncate">
        {activity.subject || "—"}
      </TD>
      <TD>
        <Link
          href={`/dashboard/customers/${activity.customer.id}`}
          className="text-primary hover:underline"
        >
          {activity.customer.name}
        </Link>
      </TD>
      <TD className="text-muted-foreground">
        {activity.createdBy?.name ?? activity.createdBy?.email ?? "—"}
      </TD>
      <TD className="text-muted-foreground">{created}</TD>
      <TD className="text-right">
        <Link
          href={`/dashboard/customers/${activity.customer.id}`}
          className="text-sm text-primary hover:underline"
        >
          View
        </Link>
      </TD>
    </TR>
  );
}
