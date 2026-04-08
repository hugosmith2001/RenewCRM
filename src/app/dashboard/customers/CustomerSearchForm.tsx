"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui";
import { FormField, formInputClasses, formSelectClasses } from "@/components/forms";

type Props = {
  initialSearch?: string;
  initialStatus?: string;
  initialType?: string;
};

export function CustomerSearchForm({
  initialSearch = "",
  initialStatus = "",
  initialType = "",
}: Props) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const search = (form.elements.namedItem("search") as HTMLInputElement)?.value?.trim() || "";
    const status = (form.elements.namedItem("status") as HTMLSelectElement)?.value || "";
    const type = (form.elements.namedItem("type") as HTMLSelectElement)?.value || "";
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    params.set("page", "1");
    router.push(`/dashboard/customers?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-filter-control">
      <div className="min-w-[220px]">
        <FormField id="search" label="Sök">
          <input
            id="search"
            name="search"
            type="text"
            defaultValue={initialSearch}
            placeholder="Namn, e-post, telefon…"
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
            <option value="">Alla</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="INACTIVE">Inaktiv</option>
            <option value="PROSPECT">Prospekt</option>
          </select>
        </FormField>
      </div>
      <div className="min-w-[120px]">
        <FormField id="type" label="Typ">
          <select
            id="type"
            name="type"
            defaultValue={initialType}
            className={formSelectClasses}
          >
            <option value="">Alla</option>
            <option value="PRIVATE">Privat</option>
            <option value="COMPANY">Företag</option>
          </select>
        </FormField>
      </div>
      <Button type="submit" variant="secondary" size="md">
        Använd
      </Button>
      {(initialSearch || initialStatus || initialType) && (
        <ButtonLink href="/dashboard/customers" variant="secondary" size="md">
          Rensa
        </ButtonLink>
      )}
    </form>
  );
}
