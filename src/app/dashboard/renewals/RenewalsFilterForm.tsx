"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui";
import { FormField, formSelectClasses } from "@/components/forms";
import { POLICY_STATUS_LABELS } from "@/lib/constants/labels";

type Broker = { id: string; name: string | null; email: string };

type Props = {
  brokers: Broker[];
  initialBrokerId?: string;
  initialStatus?: string;
};

export function RenewalsFilterForm({
  brokers,
  initialBrokerId = "",
  initialStatus = "",
}: Props) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const brokerId = (form.elements.namedItem("brokerId") as HTMLSelectElement)?.value ?? "";
    const status = (form.elements.namedItem("status") as HTMLSelectElement)?.value ?? "";
    const params = new URLSearchParams();
    if (brokerId) params.set("brokerId", brokerId);
    if (status) params.set("status", status);
    router.push(`/dashboard/renewals?${params.toString()}`);
  }

  const hasFilters = initialBrokerId || initialStatus;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-filter-control">
      <div className="min-w-[180px]">
        <FormField id="brokerId" label="Broker">
          <select
            id="brokerId"
            name="brokerId"
            defaultValue={initialBrokerId}
            className={formSelectClasses}
          >
            <option value="">All brokers</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? b.email}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="min-w-[140px]">
        <FormField id="status" label="Status">
          <select
            id="status"
            name="status"
            defaultValue={initialStatus}
            className={formSelectClasses}
          >
            <option value="">All statuses</option>
            {Object.entries(POLICY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <Button type="submit" variant="secondary" size="md">
        Apply
      </Button>
      {hasFilters && (
        <ButtonLink href="/dashboard/renewals" variant="secondary" size="md">
          Clear
        </ButtonLink>
      )}
    </form>
  );
}
