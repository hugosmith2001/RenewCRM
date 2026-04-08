import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Att göra" description="Arbetskö för alla kunder." />
      <TableShell className="mt-content-top">
        <InlineState title="Laddar att göra" description="Hämtar din arbetskö…" />
      </TableShell>
    </>
  );
}
