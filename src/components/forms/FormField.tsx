"use client";

import React from "react";

/**
 * Standard form field: label, optional description, optional error, and control.
 * Uses theme tokens only. Keeps spacing and typography consistent across forms.
 */

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
};

export function FormField({
  id,
  label,
  required,
  description,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-form-group">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-muted-foreground"> *</span>}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
