"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui";
import { FormField, formInputClasses, formSelectClasses } from "@/components/forms";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants/labels";

type Props = {
  initialType?: string;
  initialRange?: string;
};

export function ActivityFilters({
  initialType = "",
  initialRange = "",
}: Props) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const type = (form.elements.namedItem("type") as HTMLSelectElement)?.value || "";
    const range = (form.elements.namedItem("range") as HTMLSelectElement)?.value || "";
    const params = new URLSearchParams();
    params.set("page", "1");
    if (type) params.set("type", type);
    if (range) params.set("range", range);
    router.push(`/dashboard/activities?${params.toString()}`);
  }

  const hasFilters = initialType || initialRange;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-filter-control">
      <div className="min-w-[140px]">
        <FormField id="type" label="Type">
          <select
            id="type"
            name="type"
            defaultValue={initialType}
            className={formSelectClasses}
          >
            <option value="">All</option>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="min-w-[140px]">
        <FormField id="range" label="Date range">
          <select
            id="range"
            name="range"
            defaultValue={initialRange}
            className={formSelectClasses}
          >
            <option value="">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </FormField>
      </div>
      <Button type="submit" variant="secondary" size="md">
        Apply
      </Button>
      {hasFilters && (
        <ButtonLink href="/dashboard/activities" variant="secondary" size="md">
          Clear
        </ButtonLink>
      )}
    </form>
  );
}
