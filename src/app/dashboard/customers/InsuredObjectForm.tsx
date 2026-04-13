"use client";

import { useState, useEffect } from "react";
import {
  FormLayout,
  FormField,
  FormError,
  FormActions,
  formInputClasses,
  formSelectClasses,
} from "@/components/forms";

const OBJECT_TYPES = [
  { value: "PROPERTY", label: "Fastighet" },
  { value: "VEHICLE", label: "Fordon" },
  { value: "PERSON", label: "Person" },
  { value: "BUSINESS", label: "Företag" },
  { value: "EQUIPMENT", label: "Utrustning" },
  { value: "OTHER", label: "Annat" },
] as const;

export type InsuredObjectFormData = {
  type: string;
  name: string;
  description: string;
};

type InsuredObject = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  customerId: string;
  object?: InsuredObject | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const emptyForm: InsuredObjectFormData = {
  type: "PROPERTY",
  name: "",
  description: "",
};

export function InsuredObjectForm({
  customerId,
  object,
  onSuccess,
  onCancel,
}: Props) {
  const [form, setForm] = useState<InsuredObjectFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!object;

  useEffect(() => {
    if (object) {
      setForm({
        type: object.type,
        name: object.name,
        description: object.description ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [object]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        type: form.type,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      if (isEdit && object) {
        const res = await fetch(
          `/api/customers/${customerId}/insured-objects/${object.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update insured object");
        }
      } else {
        const res = await fetch(
          `/api/customers/${customerId}/insured-objects`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to add insured object");
        }
      }
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLayout variant="embedded">
        {error && <FormError message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="insured-object-type" label="Typ" required>
            <select
              id="insured-object-type"
              required
              value={form.type}
              onChange={(e) =>
                setForm((p) => ({ ...p, type: e.target.value }))
              }
              className={formSelectClasses}
            >
              {OBJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="insured-object-name" label="Namn" required>
            <input
              id="insured-object-name"
              type="text"
              required
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="t.ex. Volvo V60 2019"
              className={formInputClasses}
            />
          </FormField>
        </div>
        <FormField id="insured-object-description" label="Beskrivning">
          <textarea
            id="insured-object-description"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            className={formInputClasses}
          />
        </FormField>
        <FormActions
          submitLabel={isEdit ? "Spara ändringar" : "Lägg till försäkrat objekt"}
          onCancel={onCancel}
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}
