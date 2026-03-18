"use client";

import React from "react";

/**
 * Form-level or section-level error message. Uses theme danger tokens.
 */

type FormErrorProps = {
  message: string;
  className?: string;
};

export function FormError({ message, className }: FormErrorProps) {
  return (
    <div
      className={`rounded-card border border-danger/20 bg-danger-muted px-section-header-x py-section-header-y text-sm text-danger ${className ?? ""}`}
      role="alert"
    >
      {message}
    </div>
  );
}
