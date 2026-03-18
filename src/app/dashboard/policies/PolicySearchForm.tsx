"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui";
import { FormField, formInputClasses, formSelectClasses } from "@/components/forms";

type Props = {
  initialSearch?: string;
  initialStatus?: string;
};

export function PolicySearchForm({
  initialSearch = "",
  initialStatus = "",
}: Props) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const search = (form.elements.namedItem("search") as HTMLInputElement)?.value?.trim() ?? "";
    const status = (form.elements.namedItem("status") as HTMLSelectElement)?.value ?? "";
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("page", "1");
    router.push(`/dashboard/policies?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-filter-control">
      <div className="min-w-[220px]">
        <FormField id="search" label="Search">
          <input
            id="search"
            name="search"
            type="text"
            defaultValue={initialSearch}
            placeholder="Policy number, customer, insurer…"
            className={formInputClasses}
          />
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
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </FormField>
      </div>
      <Button type="submit" variant="secondary" size="md">
        Apply
      </Button>
      {(initialSearch || initialStatus) && (
        <ButtonLink href="/dashboard/policies" variant="secondary" size="md">
          Clear
        </ButtonLink>
      )}
    </form>
  );
}
