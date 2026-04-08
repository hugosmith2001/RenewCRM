"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerWithOwner } from "@/modules/customers";
import {
  FormLayout,
  FormField,
  FormError,
  FormActions,
  formInputClasses,
  formSelectClasses,
} from "@/components/forms";

type Props =
  | { mode: "create" }
  | { mode: "edit"; customer: CustomerWithOwner };

export function CustomerForm(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = props.mode === "edit";
  const customer = isEdit ? props.customer : null;

  const [name, setName] = useState(customer?.name ?? "");
  const [type, setType] = useState<"PRIVATE" | "COMPANY">(customer?.type ?? "PRIVATE");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "PROSPECT">(customer?.status ?? "ACTIVE");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        type,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        status,
      };
      if (isEdit && customer) {
        const res = await fetch(`/api/customers/${customer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Det gick inte att uppdatera kunden");
        }
        router.push(`/dashboard/customers/${customer.id}`);
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Det gick inte att skapa kunden");
        }
        const created = await res.json();
        router.push(`/dashboard/customers/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLayout variant="card">
        {error && <FormError message={error} />}
        <FormField id="name" label="Namn" required>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formInputClasses}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="type" label="Typ">
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as "PRIVATE" | "COMPANY")}
              className={formSelectClasses}
            >
              <option value="PRIVATE">Privat</option>
              <option value="COMPANY">Företag</option>
            </select>
          </FormField>
          <FormField id="status" label="Status">
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "PROSPECT")}
              className={formSelectClasses}
            >
              <option value="ACTIVE">Aktiv</option>
              <option value="INACTIVE">Inaktiv</option>
              <option value="PROSPECT">Prospekt</option>
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="email" label="E-post">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={formInputClasses}
            />
          </FormField>
          <FormField id="phone" label="Telefon">
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={formInputClasses}
            />
          </FormField>
        </div>
        <FormField
          id="address"
          label="Adress"
          description="Endast postadress. Undvik att lägga in anteckningar eller känsliga uppgifter."
        >
          <textarea
            id="address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={formInputClasses}
          />
        </FormField>
        <FormActions
          submitLabel={isEdit ? "Spara ändringar" : "Skapa kund"}
          loadingLabel={isEdit ? "Sparar…" : "Skapar…"}
          cancelLabel="Avbryt"
          onCancel={isEdit && customer ? () => router.push(`/dashboard/customers/${customer.id}`) : undefined}
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}
