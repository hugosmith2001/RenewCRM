"use client";

import React from "react";
import { Button } from "@/components/ui";

/**
 * Standard form actions: primary (submit) first, then secondary (cancel).
 * Uses theme tokens only.
 */

type FormActionsProps = {
  submitLabel: string;
  /** Shown on submit button when loading is true. Default "Saving…". Use e.g. "Creating…" for create flows. */
  loadingLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
};

export function FormActions({
  submitLabel,
  loadingLabel = "Sparar…",
  cancelLabel = "Avbryt",
  onCancel,
  loading = false,
}: FormActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-form-actions">
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? loadingLabel : submitLabel}
      </Button>
      {onCancel && (
        <Button type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}
