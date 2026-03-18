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
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title="Policies" />
      <EmptyState
        title="Couldn’t load policies"
        description="Please try again. If this keeps happening, check your connection or contact support."
        primaryAction={{ label: "Try again", onClick: reset }}
        secondaryAction={{ label: "Back to dashboard", href: "/dashboard" }}
      />
    </>
  );
}
