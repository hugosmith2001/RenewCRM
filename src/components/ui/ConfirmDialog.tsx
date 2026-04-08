"use client";

import { Button } from "./button";

/**
 * Confirmation dialog for destructive or important actions.
 * Uses theme tokens only. Replaces raw confirm() for consistent UX.
 */

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Bekräfta",
  cancelLabel = "Avbryt",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    await onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-card border border-border bg-surface p-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-sm font-semibold text-foreground"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <form onSubmit={handleConfirm} className="mt-4 flex justify-end gap-form-actions">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant={variant}
            disabled={loading}
          >
            {loading ? "…" : confirmLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
