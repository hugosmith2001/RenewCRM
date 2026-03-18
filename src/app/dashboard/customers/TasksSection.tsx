"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskForm } from "./TaskForm";
import { DetailSection, sectionListClasses, sectionListItemClasses, sectionInnerGapClass } from "@/components/layout";
import { FormError } from "@/components/forms";
import { Badge, Button, ConfirmDialog } from "@/components/ui";

const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  assignedToUserId: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
};

type Props = { customerId: string };

export function TasksSection({ customerId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/tasks`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTasks(data);
    } catch {
      setError("Couldn’t load tasks.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  function openAdd() {
    setEditingTask(null);
    setShowForm(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/tasks/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchTasks();
        if (editingTask?.id === deleteId) closeForm();
      }
    } catch {
      // ignore
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }

  function formatDueDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < today.getTime()) {
      return `${d.toLocaleDateString()} (overdue)`;
    }
    return d.toLocaleDateString();
  }

  return (
    <DetailSection
      id="tasks"
      title="Tasks & reminders"
      actions={
        <Button type="button" onClick={openAdd} variant="primary" size="sm">
          Add task
        </Button>
      }
    >
      {showForm && (
        <div className={sectionInnerGapClass}>
          <TaskForm
            customerId={customerId}
            task={editingTask}
            onSuccess={() => {
              fetchTasks();
              closeForm();
            }}
            onCancel={closeForm}
          />
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading tasks…
        </p>
      ) : error ? (
        <FormError message={error} />
      ) : tasks.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">
          No tasks yet. Add a task or reminder and optionally assign it to a
          team member.
        </p>
      ) : (
        <ul className={sectionListClasses}>
          {tasks.map((t) => (
            <li
              key={t.id}
              className={`flex flex-wrap items-center justify-between gap-2 ${sectionListItemClasses}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-medium text-foreground ${
                      t.status === "DONE" ? "line-through opacity-75" : ""
                    }`}
                  >
                    {t.title}
                  </span>
                  <Badge
                    tone={
                      t.status === "DONE"
                        ? "success"
                        : t.status === "IN_PROGRESS"
                          ? "info"
                          : t.status === "CANCELLED"
                            ? "neutral"
                            : "warning"
                    }
                  >
                    {TASK_STATUS_LABELS[t.status] ?? t.status}
                  </Badge>
                  {t.priority === "HIGH" && (
                    <Badge tone="danger">High</Badge>
                  )}
                </div>
                {t.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0 text-xs text-muted-foreground">
                  <span>Due: {formatDueDate(t.dueDate)}</span>
                  {t.assignedTo && (
                    <span>
                      Assigned to {t.assignedTo.name ?? t.assignedTo.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => openEdit(t)}
                  variant="ghost"
                  size="sm"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  onClick={() => setDeleteId(t.id)}
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete task"
        message="Delete this task? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </DetailSection>
  );
}
