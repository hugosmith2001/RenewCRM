"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui";
import { FormField, formInputClasses, formSelectClasses } from "@/components/forms";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants/labels";

type Customer = { id: string; name: string };

type Props = {
  customers: Customer[];
  initialCustomerId?: string;
  initialType?: string;
  initialRange?: string;
  initialSearch?: string;
};

export function DocumentFilters({
  customers,
  initialCustomerId = "",
  initialType = "",
  initialRange = "",
  initialSearch = "",
}: Props) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const customerId = (form.elements.namedItem("customerId") as HTMLSelectElement)?.value || "";
    const type = (form.elements.namedItem("documentType") as HTMLSelectElement)?.value || "";
    const range = (form.elements.namedItem("range") as HTMLSelectElement)?.value || "";
    const search = (form.elements.namedItem("search") as HTMLInputElement)?.value?.trim() || "";
    const params = new URLSearchParams();
    params.set("page", "1");
    if (customerId) params.set("customerId", customerId);
    if (type) params.set("documentType", type);
    if (range) params.set("range", range);
    if (search) params.set("search", search);
    router.push(`/dashboard/documents?${params.toString()}`);
  }

  const hasFilters = initialCustomerId || initialType || initialRange || initialSearch;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-filter-control">
      <div className="min-w-[180px]">
        <FormField id="customerId" label="Customer">
          <select
            id="customerId"
            name="customerId"
            defaultValue={initialCustomerId}
            className={formSelectClasses}
          >
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="min-w-[140px]">
        <FormField id="documentType" label="Type">
          <select
            id="documentType"
            name="documentType"
            defaultValue={initialType}
            className={formSelectClasses}
          >
            <option value="">All types</option>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="min-w-[140px]">
        <FormField id="range" label="Uploaded">
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
      <div className="min-w-[200px]">
        <FormField id="search" label="Search name">
          <input
            id="search"
            name="search"
            type="search"
            defaultValue={initialSearch}
            placeholder="Document name…"
            className={formInputClasses}
          />
        </FormField>
      </div>
      <Button type="submit" variant="secondary" size="md">
        Apply
      </Button>
      {hasFilters && (
        <ButtonLink href="/dashboard/documents" variant="secondary" size="md">
          Clear
        </ButtonLink>
      )}
    </form>
  );
}
