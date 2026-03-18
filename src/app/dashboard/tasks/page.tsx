import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { listTasksForTenant, type TaskForWorkQueue } from "@/modules/tasks";
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
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/constants/labels";

const COMPLETED_STATUSES = ["DONE", "CANCELLED"];

function isCompleted(status: string) {
  return COMPLETED_STATUSES.includes(status);
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function partitionTasks(tasks: TaskForWorkQueue[]) {
  const today = startOfDay(new Date());
  const dueSoonEnd = new Date(today);
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 7);

  const overdue: TaskForWorkQueue[] = [];
  const dueSoon: TaskForWorkQueue[] = [];
  const open: TaskForWorkQueue[] = [];
  const completed: TaskForWorkQueue[] = [];

  for (const t of tasks) {
    const completedStatus = isCompleted(t.status);
    const due = t.dueDate ? startOfDay(new Date(t.dueDate)) : null;

    if (completedStatus) {
      completed.push(t);
      continue;
    }
    if (due && due < today) {
      overdue.push(t);
    } else if (due && due <= dueSoonEnd) {
      dueSoon.push(t);
    } else {
      open.push(t);
    }
  }

  return { overdue, dueSoon, open, completed };
}

function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) return "—";
  return new Date(dueDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TaskTable({
  tasks,
  emptyMessage,
}: {
  tasks: TaskForWorkQueue[];
  emptyMessage: string;
}) {
  if (tasks.length === 0) {
    return (
      <div className="p-section-body text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <THead>
        <tr>
          <TH className="w-[20%]">Title</TH>
          <TH>Customer</TH>
          <TH>Policy</TH>
          <TH>Assigned to</TH>
          <TH>Status</TH>
          <TH>Priority</TH>
          <TH>Due date</TH>
          <TH className="text-right">Action</TH>
        </tr>
      </THead>
      <TBody>
        {tasks.map((t) => {
          const statusTone =
            t.status === "DONE"
              ? "success"
              : t.status === "IN_PROGRESS"
                ? "info"
                : t.status === "CANCELLED"
                  ? "neutral"
                  : "warning";
          const priorityTone =
            t.priority === "HIGH" ? "danger" : t.priority === "LOW" ? "neutral" : "info";
          return (
            <TR key={t.id}>
              <TD className="font-medium text-foreground">
                <span className={t.status === "DONE" ? "line-through opacity-75" : ""}>
                  {t.title}
                </span>
              </TD>
              <TD>
                <Link
                  href={`/dashboard/customers/${t.customer.id}`}
                  className="text-primary hover:underline"
                >
                  {t.customer.name}
                </Link>
              </TD>
              <TD className="text-muted-foreground">—</TD>
              <TD className="text-muted-foreground">
                {t.assignedTo?.name ?? t.assignedTo?.email ?? "—"}
              </TD>
              <TD>
                <Badge tone={statusTone}>{TASK_STATUS_LABELS[t.status] ?? t.status}</Badge>
              </TD>
              <TD>
                <Badge tone={priorityTone}>{TASK_PRIORITY_LABELS[t.priority] ?? t.priority}</Badge>
              </TD>
              <TD className="text-muted-foreground">{formatDueDate(t.dueDate)}</TD>
              <TD className="text-right">
                <Link
                  href={`/dashboard/customers/${t.customer.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View
                </Link>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tasks = await listTasksForTenant(user.tenantId);
  const { overdue, dueSoon, open, completed } = partitionTasks(tasks);
  const totalOpen = overdue.length + dueSoon.length + open.length;

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Work queue across all customers. Manage reminders and follow-ups."
        actions={
          <ButtonLink href="/dashboard/customers" variant="secondary" size="sm">
            Customers
          </ButtonLink>
        }
      />

      <ListToolbar
        left={null}
        right={
          <div className="text-sm text-muted-foreground">
            {totalOpen} open · {completed.length} completed · {tasks.length} total
          </div>
        }
      />

      <div className="mt-content-top space-y-section-gap">
        {overdue.length > 0 && (
          <section className="mb-section-gap" aria-labelledby="tasks-overdue">
            <div className="mb-1.5 flex items-center gap-2">
              <h2
                id="tasks-overdue"
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Overdue ({overdue.length})
              </h2>
            </div>
            <TableShell>
              <TaskTable
                tasks={overdue}
                emptyMessage="No overdue tasks."
              />
            </TableShell>
          </section>
        )}

        {dueSoon.length > 0 && (
          <section className="mb-section-gap" aria-labelledby="tasks-due-soon">
            <div className="mb-1.5 flex items-center gap-2">
              <h2
                id="tasks-due-soon"
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Due soon ({dueSoon.length})
              </h2>
            </div>
            <TableShell>
              <TaskTable
                tasks={dueSoon}
                emptyMessage="No tasks due in the next 7 days."
              />
            </TableShell>
          </section>
        )}

        <section className="mb-4" aria-labelledby="tasks-open">
          <div className="mb-1.5 flex items-center gap-2">
            <h2 id="tasks-open" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Open ({open.length})
            </h2>
          </div>
          <TableShell>
            {open.length === 0 && overdue.length === 0 && dueSoon.length === 0 ? (
              <InlineState
                title="No open tasks"
                description={
                  <span>
                    Tasks are created on customer pages.{" "}
                    <Link href="/dashboard/customers" className="text-primary hover:underline">
                      Go to customers
                    </Link>{" "}
                    to add tasks and reminders.
                  </span>
                }
              />
            ) : (
              <TaskTable
                tasks={open}
                emptyMessage="No other open tasks."
              />
            )}
          </TableShell>
        </section>

        <section className="mb-section-gap opacity-90" aria-labelledby="tasks-completed">
          <div className="mb-1.5 flex items-center gap-2">
            <h2
              id="tasks-completed"
              className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Completed ({completed.length})
            </h2>
          </div>
          <TableShell className="border-border bg-surface-muted/50">
            <TaskTable
              tasks={completed}
              emptyMessage="No completed tasks."
            />
          </TableShell>
        </section>
      </div>
    </>
  );
}
