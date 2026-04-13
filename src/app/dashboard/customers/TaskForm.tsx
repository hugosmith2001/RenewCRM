"use client";

import { useState, useEffect } from "react";
import {
  FormLayout,
  FormField,
  FormError,
  FormActions,
  formInputClasses,
} from "@/components/forms";

const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Låg",
  MEDIUM: "Medel",
  HIGH: "Hög",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pågående",
  IN_PROGRESS: "Pågår",
  DONE: "Klar",
  CANCELLED: "Avbruten",
};

export type TaskFormData = {
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  status: string;
};

type Props = {
  customerId: string;
  task?: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    priority: string;
    status: string;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const emptyForm: TaskFormData = {
  title: "",
  description: "",
  dueDate: "",
  priority: "MEDIUM",
  status: "PENDING",
};

function formatDateForInput(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export function TaskForm({ customerId, task, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<TaskFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!task;

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        dueDate: formatDateForInput(task.dueDate),
        priority: task.priority,
        status: task.status,
      });
    } else {
      setForm(emptyForm);
    }
  }, [task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        status: form.status,
      };
      if (isEdit && task) {
        const res = await fetch(`/api/customers/${customerId}/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Det gick inte att uppdatera att göra.");
        }
      } else {
        const res = await fetch(`/api/customers/${customerId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Det gick inte att skapa att göra.");
        }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLayout variant="embedded">
        {error && <FormError message={error} />}
        <FormField id="task-title" label="Titel" required>
          <input
            id="task-title"
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="t.ex. Följ upp offert"
            className={formInputClasses}
          />
        </FormField>
        <FormField id="task-description" label="Beskrivning">
          <textarea
            id="task-description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Valfria detaljer"
            className={formInputClasses}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="task-due" label="Förfallodatum">
            <input
              id="task-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              className={formInputClasses}
            />
          </FormField>
          <FormField id="task-priority" label="Prioritet">
            <select
              id="task-priority"
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              className={formInputClasses}
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="task-status" label="Status">
            <select
              id="task-status"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              className={formInputClasses}
            >
              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormActions
          submitLabel={isEdit ? "Spara ändringar" : "Skapa att göra"}
          onCancel={onCancel}
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}
