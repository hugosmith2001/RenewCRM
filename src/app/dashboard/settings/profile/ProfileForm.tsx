"use client";

import React, { useState } from "react";
import {
  FormLayout,
  FormField,
  FormError,
  FormActions,
  formInputClasses,
} from "@/components/forms";

type ProfileFormProps = {
  initialName: string;
  email: string;
};

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kunde inte uppdatera profilen");
      }

      setSuccess("Profilen uppdaterades");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
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
        <FormField id="profile-email" label="E-post">
          <input
            id="profile-email"
            type="email"
            value={email}
            readOnly
            disabled
            className={formInputClasses}
          />
        </FormField>
        <FormField id="profile-name" label="Visningsnamn" required>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formInputClasses}
            required
          />
        </FormField>
        <FormActions
          submitLabel="Spara ändringar"
          loadingLabel="Sparar…"
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}

