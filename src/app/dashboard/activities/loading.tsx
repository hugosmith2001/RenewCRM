import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Activities" description="Recent activity across all customers." />
      <TableShell className="mt-content-top">
        <InlineState title="Loading activities" description="Fetching the activity feed…" />
      </TableShell>
    </>
  );
}
