import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Customers" />
      <TableShell className="mt-content-top">
        <InlineState title="Loading customers" description="Fetching the latest customer list…" />
      </TableShell>
    </>
  );
}

