import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
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
  searchParams: Promise<{ type?: string; range?: string; page?: string }>;
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
    range: sp.range,
    page: sp.page,
    limit: 50,
  });
  const query = parsed.success ? parsed.data : listActivitiesQuerySchema.parse({});
  const { from, to } = getDateRange(query.range);
  const offset = (query.page - 1) * query.limit;

  const { activities, total } = await listActivitiesForTenant(user.tenantId, {
    type: query.type,
    from,
    to,
    limit: query.limit,
    offset,
  });

  const totalPages = Math.ceil(total / query.limit);
  const hasFilters = !!(query.type || query.range);

  return (
    <>
      <PageHeader
        title="Aktiviteter"
        description="Senaste aktivitet för alla kunder. Samtal, möten, e-post, anteckningar och rådgivning."
        actions={
          <ButtonLink href="/dashboard" variant="secondary" size="sm">
            Tillbaka till översikt
          </ButtonLink>
        }
      />

      <ListToolbar
        left={
          <ActivityFilters
            initialType={query.type ?? ""}
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
              title={hasFilters ? "Inga träffar" : "Inga aktiviteter ännu"}
              description={
                hasFilters ? (
                  <span>
                    Prova att justera filtren, eller{" "}
                    <Link href="/dashboard/activities" className="text-primary hover:underline">
                      rensa filter
                    </Link>
                    .
                  </span>
                ) : (
                  <span>
                    Aktiviteter loggas på kundsidor.{" "}
                    <Link href="/dashboard/customers" className="text-primary hover:underline">
                      Öppna en kund
                    </Link>{" "}
                    för att logga samtal, möten, e-post eller anteckningar.
                  </span>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH className="w-[10%]">Typ</TH>
                  <TH className="w-[24%]">Titel</TH>
                  <TH className="w-[20%]">Kund</TH>
                  <TH className="w-[18%]">Skapad</TH>
                  <TH className="text-right w-[10%]">Åtgärd</TH>
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
            Sida {query.page} av {totalPages} ({total} totalt)
          </p>
          <div className="flex gap-2">
            {query.page > 1 && (
              <ButtonLink
                href={`/dashboard/activities?${new URLSearchParams({
                  ...(query.type && { type: query.type }),
                  ...(query.range && { range: query.range }),
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
                href={`/dashboard/activities?${new URLSearchParams({
                  ...(query.type && { type: query.type }),
                  ...(query.range && { range: query.range }),
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
      <TD className="text-muted-foreground">{created}</TD>
      <TD className="text-right">
        <Link
          href={`/dashboard/customers/${activity.customer.id}`}
          className="text-sm text-primary hover:underline"
        >
          Visa
        </Link>
      </TD>
    </TR>
  );
}
