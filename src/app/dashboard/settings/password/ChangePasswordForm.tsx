"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  FormLayout,
  FormField,
  FormError,
  formInputClasses,
} from "@/components/forms";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to change password");
      }

      setSuccess("Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLayout variant="embedded">
        {error && <FormError message={error} />}
        {success && (
          <p className="text-sm font-medium text-emerald-600">{success}</p>
        )}
        <FormField id="currentPassword" label="Current password" required>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={formInputClasses}
          />
        </FormField>
        <FormField id="newPassword" label="New password" required>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={formInputClasses}
          />
        </FormField>
        <FormField
          id="confirmNewPassword"
          label="Confirm new password"
          required
        >
          <input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className={formInputClasses}
          />
        </FormField>
        <Button
          type="submit"
          variant="primary"
          className="mt-2 w-full sm:w-auto"
          disabled={loading}
        >
          {loading ? "Saving…" : "Change password"}
        </Button>
      </FormLayout>
    </form>
  );
}

