import { PageHeader, DetailSection } from "@/components/layout";
import { InlineState } from "@/components/ui";

export default function PolicyDetailLoading() {
  return (
    <>
      <PageHeader title="—" backLabel="Kund" />
      <div className="space-y-section-gap">
        <DetailSection title="Översikt">
          <InlineState
            title="Laddar försäkring"
            description="Hämtar försäkringsdetaljer…"
          />
        </DetailSection>
      </div>
    </>
  );
}
