import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Aktiviteter" description="Senaste aktivitet för alla kunder." />
      <TableShell className="mt-content-top">
        <InlineState title="Laddar aktiviteter" description="Hämtar aktivitetsflödet…" />
      </TableShell>
    </>
  );
}
