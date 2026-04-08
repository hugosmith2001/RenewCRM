import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Försäkringar" description="Alla försäkringar i ditt bestånd." />
      <TableShell className="mt-content-top">
        <InlineState title="Laddar försäkringar" description="Hämtar den senaste listan…" />
      </TableShell>
    </>
  );
}
