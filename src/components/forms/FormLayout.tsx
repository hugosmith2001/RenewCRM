"use client";

import React from "react";

/**
 * Wrapper for form content. Variant:
 * - card: standalone page form (e.g. customer create/edit)
 * - embedded: form inside a section (contacts, policies, tasks, etc.)
 * Uses theme tokens only.
 */

type FormLayoutProps = {
  variant?: "card" | "embedded";
  children: React.ReactNode;
  className?: string;
};

export function FormLayout({
  variant = "embedded",
  children,
  className,
}: FormLayoutProps) {
  const base =
    "rounded-card border border-border space-y-form-section";
  const variants = {
    card: "max-w-2xl bg-surface p-card",
    embedded: "bg-surface-muted p-section-body",
  };
  return (
    <div className={`${base} ${variants[variant]} ${className ?? ""}`.trim()}>
      {children}
    </div>
  );
}
