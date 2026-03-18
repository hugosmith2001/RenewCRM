import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Tasks" description="Work queue across all customers." />
      <TableShell className="mt-content-top">
        <InlineState title="Loading tasks" description="Fetching your task queue…" />
      </TableShell>
    </>
  );
}
