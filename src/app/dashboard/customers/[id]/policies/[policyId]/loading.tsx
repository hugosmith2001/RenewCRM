import { PageHeader, DetailSection } from "@/components/layout";
import { InlineState } from "@/components/ui";

export default function PolicyDetailLoading() {
  return (
    <>
      <PageHeader title="—" backLabel="Customer" />
      <div className="space-y-section-gap">
        <DetailSection title="Overview">
          <InlineState
            title="Loading policy"
            description="Fetching policy details…"
          />
        </DetailSection>
      </div>
    </>
  );
}
