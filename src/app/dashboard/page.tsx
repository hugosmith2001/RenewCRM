import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { listRenewalsBucketed } from "@/modules/renewals";
import { listTasksForTenant, type TaskForWorkQueue } from "@/modules/tasks";
import { listActivitiesForTenant, type ActivityForFeed } from "@/modules/activities";
import { listDocumentsForTenant, type DocumentForList } from "@/modules/documents";
import { redirect } from "next/navigation";
import { PageHeader, sectionListClasses } from "@/components/layout";
import { Badge } from "@/components/ui";
import { POLICY_STATUS_LABELS, PRODUCT_TYPE_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, ACTIVITY_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from "@/lib/constants/labels";
import type { RenewalItem } from "@/modules/renewals";

const RENEWALS_PREVIEW = 5;
const TASKS_PREVIEW = 5;
const ACTIVITIES_PREVIEW = 5;
const DOCUMENTS_PREVIEW = 5;

const COMPLETED_TASK_STATUSES = ["DONE", "CANCELLED"];

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isDueToday(dueDate: Date | null): boolean {
  if (!dueDate) return false;
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  return today.getTime() === due.getTime();
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function renewalStatusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  return "neutral";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [buckets, allTasks, { activities }, { documents }] = await Promise.all([
    listRenewalsBucketed(user.tenantId),
    listTasksForTenant(user.tenantId),
    listActivitiesForTenant(user.tenantId, { limit: ACTIVITIES_PREVIEW }),
    listDocumentsForTenant(user.tenantId, { limit: DOCUMENTS_PREVIEW }),
  ]);

  const renewalsDueThisWeek = [...buckets.overdue, ...buckets.next7].slice(0, RENEWALS_PREVIEW);
  const tasksDueToday = allTasks.filter(
    (t) => !COMPLETED_TASK_STATUSES.includes(t.status) && isDueToday(t.dueDate)
  ).slice(0, TASKS_PREVIEW);

  return (
    <>
      <PageHeader
        title="Översikt"
        description="Snabb överblick över förnyelser, att göra, aktiviteter och dokument."
      />

      <div className="mt-4 grid gap-section-gap sm:grid-cols-2">
        <DashboardSection title="Förnyelser denna vecka" viewAllHref="/dashboard/renewals">
          {renewalsDueThisWeek.length > 0 ? (
            <ul className={sectionListClasses}>
              {renewalsDueThisWeek.map((item) => (
                <RenewalRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <EmptyBlock
              title="Inga förnyelser denna vecka"
              description="Försäkringar som förfaller inom de kommande 7 dagarna (eller är försenade) visas här. Ange förnyelsedatum på försäkringar på kundsidan."
              actionHref="/dashboard/customers"
              actionLabel="Visa kunder"
            />
          )}
        </DashboardSection>

        <DashboardSection title="Att göra som förfaller idag" viewAllHref="/dashboard/tasks">
          {tasksDueToday.length > 0 ? (
            <ul className={sectionListClasses}>
              {tasksDueToday.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          ) : (
            <EmptyBlock
              title="Inget förfaller idag"
              description="Här visas sådant som förfaller idag. Lägg till att göra på kundsidor."
              actionHref="/dashboard/customers"
              actionLabel="Visa kunder"
            />
          )}
        </DashboardSection>

        <DashboardSection title="Senaste aktiviteter" viewAllHref="/dashboard/activities">
          {activities.length > 0 ? (
            <ul className={sectionListClasses}>
              {activities.map((a) => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </ul>
          ) : (
            <EmptyBlock
              title="Inga senaste aktiviteter"
              description="Samtal, möten, e-post och anteckningar som loggas på kundsidor visas här."
              actionHref="/dashboard/customers"
              actionLabel="Visa kunder"
            />
          )}
        </DashboardSection>

        <DashboardSection title="Senaste dokument" viewAllHref="/dashboard/documents">
          {documents.length > 0 ? (
            <ul className={sectionListClasses}>
              {documents.map((d) => (
                <DocumentRow key={d.id} doc={d} />
              ))}
            </ul>
          ) : (
            <EmptyBlock
              title="Inga dokument ännu"
              description="Dokument som laddas upp från kundsidor visas här."
              actionHref="/dashboard/customers"
              actionLabel="Visa kunder"
            />
          )}
        </DashboardSection>
      </div>
    </>
  );
}

function DashboardSection({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-card border border-border bg-surface"
      aria-labelledby={title.replace(/\s+/g, "-").toLowerCase()}
    >
      <div className="flex items-center justify-between border-b border-border px-section-header-x py-section-header-y">
        <h2
          id={title.replace(/\s+/g, "-").toLowerCase()}
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="text-sm font-medium text-primary hover:text-primary-hover no-underline"
        >
          Visa alla
        </Link>
      </div>
      <div className="p-section-body">{children}</div>
    </section>
  );
}

function EmptyBlock({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="py-section-list-row pt-0 text-left">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      <Link
        href={actionHref}
        className="mt-1.5 inline-block text-sm font-medium text-primary hover:text-primary-hover no-underline"
      >
        {actionLabel} →
      </Link>
    </div>
  );
}

function RenewalRow({ item }: { item: RenewalItem }) {
  return (
    <li className="py-section-list-row first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/customers/${item.customerId}/policies/${item.id}`}
            className="truncate text-sm font-medium text-primary hover:underline"
          >
            {item.customerName} · {item.policyNumber}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.insurerName}
            {item.productType ? ` · ${PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={renewalStatusTone(item.status)}>
            {POLICY_STATUS_LABELS[item.status] ?? item.status}
          </Badge>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {item.renewalDate ? formatDate(item.renewalDate) : "—"}
          </span>
        </div>
      </div>
    </li>
  );
}

function TaskRow({ task }: { task: TaskForWorkQueue }) {
  const statusTone =
    task.status === "DONE" ? "success" : task.status === "IN_PROGRESS" ? "info" : task.status === "CANCELLED" ? "neutral" : "warning";
  const priorityTone = task.priority === "HIGH" ? "danger" : task.priority === "LOW" ? "neutral" : "info";
  return (
    <li className="py-section-list-row first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/customers/${task.customer.id}`}
            className="truncate text-sm font-medium text-primary hover:underline"
          >
            {task.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {task.customer.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone={statusTone}>{TASK_STATUS_LABELS[task.status] ?? task.status}</Badge>
          <Badge tone={priorityTone}>{TASK_PRIORITY_LABELS[task.priority] ?? task.priority}</Badge>
        </div>
      </div>
    </li>
  );
}

function ActivityRow({ activity }: { activity: ActivityForFeed }) {
  return (
    <li className="py-section-list-row first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/customers/${activity.customer.id}`}
            className="truncate text-sm font-medium text-primary hover:underline"
          >
            {activity.subject || "—"}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {activity.customer.name}
            {activity.createdBy ? ` · ${activity.createdBy.name ?? activity.createdBy.email}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone="neutral">
            {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
          </Badge>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDateTime(activity.createdAt)}
          </span>
        </div>
      </div>
    </li>
  );
}

function DocumentRow({ doc }: { doc: DocumentForList }) {
  return (
    <li className="py-section-list-row first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/customers/${doc.customer.id}#documents`}
            className="truncate text-sm font-medium text-primary hover:underline"
            title={doc.name || undefined}
          >
            {doc.name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {doc.customer.name}
            {doc.policy ? ` · ${doc.policy.policyNumber}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone="neutral">
            {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
          </Badge>
          <a
            href={`/api/customers/${doc.customer.id}/documents/${doc.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Ladda ner
          </a>
        </div>
      </div>
    </li>
  );
}
