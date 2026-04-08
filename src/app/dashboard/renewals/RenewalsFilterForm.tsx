"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui";
import { FormField, formSelectClasses } from "@/components/forms";
import { POLICY_STATUS_LABELS } from "@/lib/constants/labels";

type Props = {
  initialStatus?: string;
};

export function RenewalsFilterForm({
  initialStatus = "",
}: Props) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const status = (form.elements.namedItem("status") as HTMLSelectElement)?.value ?? "";
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    router.push(`/dashboard/renewals?${params.toString()}`);
  }

  const hasFilters = initialStatus;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-filter-control">
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
