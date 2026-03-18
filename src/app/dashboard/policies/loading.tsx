import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Policies" description="All policies across your book." />
      <TableShell className="mt-content-top">
        <InlineState title="Loading policies" description="Fetching the latest policy list…" />
      </TableShell>
    </>
  );
}
