import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Renewals" description="Your renewal queue. Policies with a renewal date appear here." />
      <TableShell className="mt-content-top">
        <InlineState title="Loading renewals" description="Fetching your renewal queue…" />
      </TableShell>
    </>
  );
}
