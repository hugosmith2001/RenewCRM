"use client";

import React, { useState, useEffect } from "react";
import {
  FormLayout,
  FormField,
  FormError,
  FormActions,
  formInputClasses,
} from "@/components/forms";

type BrokerageFormProps = {
  initialName: string;
  slug: string;
};

export function BrokerageForm({ initialName, slug }: BrokerageFormProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update brokerage settings");
      }

      setSuccess("Brokerage name updated");
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
      <FormLayout variant="card">
        {error && <FormError message={error} />}
        {success && (
          <p className="text-sm text-green-600" role="status">
            {success}
          </p>
        )}
        <FormField id="brokerage-slug" label="Slug">
          <input
            id="brokerage-slug"
            type="text"
            value={slug}
            readOnly
            disabled
            className={formInputClasses}
          />
        </FormField>
        <FormField id="brokerage-name" label="Brokerage name" required>
          <input
            id="brokerage-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formInputClasses}
            required
          />
        </FormField>
        <FormActions
          submitLabel="Save changes"
          loadingLabel="Saving…"
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}

