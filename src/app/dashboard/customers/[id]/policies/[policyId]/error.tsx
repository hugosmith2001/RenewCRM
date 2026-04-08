"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";
import { logger } from "@/lib/logger";

export default function PolicyDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("UI error boundary: policy detail", { error, digest: error.digest });
  }, [error]);

  return (
    <>
      <PageHeader title="Försäkring" backLabel="Kund" />
      <EmptyState
        title="Det gick inte att läsa in försäkringen"
        description="Försäkringen kanske inte finns eller så saknar du åtkomst. Försök igen eller gå tillbaka till kunden."
        primaryAction={{ label: "Försök igen", onClick: reset }}
        secondaryAction={{ label: "Tillbaka till kunder", href: "/dashboard/customers" }}
      />
    </>
  );
}
