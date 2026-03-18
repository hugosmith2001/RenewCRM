"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";

export default function PolicyDetailError({
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
      <PageHeader title="Policy" backLabel="Customer" />
      <EmptyState
        title="Couldn’t load policy"
        description="The policy may not exist or you may not have access. Try again or return to the customer."
        primaryAction={{ label: "Try again", onClick: reset }}
        secondaryAction={{ label: "Back to customers", href: "/dashboard/customers" }}
      />
    </>
  );
}
