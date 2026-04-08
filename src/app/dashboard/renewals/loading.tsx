import { PageHeader } from "@/components/layout";
import { InlineState, TableShell } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageHeader title="Förnyelser" description="Din förnyelsekö. Försäkringar med förnyelsedatum visas här." />
      <TableShell className="mt-content-top">
        <InlineState title="Laddar förnyelser" description="Hämtar din förnyelsekö…" />
      </TableShell>
    </>
  );
}
