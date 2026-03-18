import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Documents" description="All documents across your book." />
      <TableShell className="mt-content-top">
        <InlineState title="Loading documents" description="Fetching the document list…" />
      </TableShell>
    </>
  );
}
