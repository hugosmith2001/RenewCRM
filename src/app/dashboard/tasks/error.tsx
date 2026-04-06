"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("UI error boundary: tasks", { error, digest: error.digest });
  }, [error]);

  return (
    <>
      <PageHeader title="Tasks" />
      <EmptyState
        title="Couldn’t load tasks"
        description="Please try again. If this keeps happening, check your connection or contact support."
        primaryAction={{ label: "Try again", onClick: reset }}
        secondaryAction={{ label: "Back to dashboard", href: "/dashboard" }}
      />
    </>
  );
}
