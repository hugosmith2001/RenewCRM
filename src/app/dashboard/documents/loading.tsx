import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Dokument" description="Alla dokument i ditt bestånd." />
      <TableShell className="mt-content-top">
        <InlineState title="Laddar dokument" description="Hämtar dokumentlistan…" />
      </TableShell>
    </>
  );
}
