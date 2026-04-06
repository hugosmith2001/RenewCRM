"use client";

import React from "react";

type Props = {
  className?: string;
  message?: string;
};

const DEFAULT_MESSAGE =
  "Avoid storing sensitive personal data (e.g. health information) unless necessary.";

export function SensitiveDataWarning({ className, message = DEFAULT_MESSAGE }: Props) {
  return (
    <p
      className={[
        "mt-1 text-xs text-muted-foreground",
        "rounded-md border border-border bg-surface px-2 py-1",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {message}
    </p>
  );
}

