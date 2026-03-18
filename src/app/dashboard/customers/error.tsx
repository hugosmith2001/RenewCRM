"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Intentionally minimal: this is internal SaaS, logs are handled by hosting.
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title="Customers" />
      <EmptyState
        title="Couldn’t load customers"
        description="Please try again. If this keeps happening, check your connection or contact support."
        primaryAction={{ label: "Try again", onClick: reset }}
        secondaryAction={{ label: "Back to dashboard", href: "/dashboard" }}
      />
    </>
  );
}

