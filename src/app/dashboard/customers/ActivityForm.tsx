"use client";

import { useState, useEffect } from "react";
import {
  FormLayout,
  FormField,
  FormError,
  FormActions,
  SensitiveDataWarning,
  formInputClasses,
  formSelectClasses,
} from "@/components/forms";

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  MEETING: "Meeting",
  EMAIL: "Email",
  NOTE: "Note",
  ADVICE: "Advice",
};

export type ActivityFormData = {
  type: string;
  subject: string;
  body: string;
};

type Props = {
  customerId: string;
  activity?: {
    id: string;
    type: string;
    subject: string | null;
    body: string | null;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const emptyForm: ActivityFormData = {
  type: "NOTE",
  subject: "",
  body: "",
};

export function ActivityForm({ customerId, activity, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<ActivityFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!activity;

  useEffect(() => {
    if (activity) {
      setForm({
        type: activity.type,
        subject: activity.subject ?? "",
        body: activity.body ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [activity]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        type: form.type,
        subject: form.subject.trim() || undefined,
        body: form.body.trim() || undefined,
      };
      if (isEdit && activity) {
        const res = await fetch(`/api/customers/${customerId}/activities/${activity.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update activity");
        }
      } else {
        const res = await fetch(`/api/customers/${customerId}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to add activity");
        }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLayout variant="embedded">
        {error && <FormError message={error} />}
        <FormField id="activity-type" label="Type">
          <select
            id="activity-type"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            className={formSelectClasses}
          >
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="activity-subject" label="Subject">
          <input
            id="activity-subject"
            type="text"
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            placeholder="Brief subject"
            className={formInputClasses}
          />
          <SensitiveDataWarning />
        </FormField>
        <FormField id="activity-body" label="Notes">
          <textarea
            id="activity-body"
            rows={4}
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            placeholder="Details of the call, meeting, or note…"
            className={formInputClasses}
          />
          <SensitiveDataWarning />
        </FormField>
        <FormActions
          submitLabel={isEdit ? "Save changes" : "Add activity"}
          onCancel={onCancel}
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}
