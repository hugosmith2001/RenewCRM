import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Kunder" />
      <TableShell className="mt-content-top">
        <InlineState title="Laddar kunder" description="Hämtar den senaste kundlistan…" />
      </TableShell>
    </>
  );
}

