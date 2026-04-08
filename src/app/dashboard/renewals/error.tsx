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
    logger.error("UI error boundary: renewals", { error, digest: error.digest });
  }, [error]);

  return (
    <>
      <PageHeader title="Förnyelser" />
      <EmptyState
        title="Det gick inte att läsa in förnyelser"
        description="Försök igen. Om problemet fortsätter, kontrollera din anslutning eller kontakta support."
        primaryAction={{ label: "Försök igen", onClick: reset }}
        secondaryAction={{ label: "Tillbaka till översikt", href: "/dashboard" }}
      />
    </>
  );
}
