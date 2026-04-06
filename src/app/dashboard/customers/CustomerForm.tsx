"use client";

import { useState, useEffect } from "react";
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

type UserOption = { id: string; name: string | null; email: string };

type Props =
  | { mode: "create" }
  | { mode: "edit"; customer: CustomerWithOwner };

export function CustomerForm(props: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = props.mode === "edit";
  const customer = isEdit ? props.customer : null;

  const [name, setName] = useState(customer?.name ?? "");
  const [type, setType] = useState<"PRIVATE" | "COMPANY">(customer?.type ?? "PRIVATE");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [ownerBrokerId, setOwnerBrokerId] = useState(customer?.ownerBrokerId ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "PROSPECT">(customer?.status ?? "ACTIVE");

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.ok ? res.json() : [])
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

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
        ownerBrokerId: ownerBrokerId || null,
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
          throw new Error(data.error ?? "Failed to update customer");
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
          throw new Error(data.error ?? "Failed to create customer");
        }
        const created = await res.json();
        router.push(`/dashboard/customers/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLayout variant="card">
        {error && <FormError message={error} />}
        <FormField id="name" label="Name" required>
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
          <FormField id="type" label="Type">
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as "PRIVATE" | "COMPANY")}
              className={formSelectClasses}
            >
              <option value="PRIVATE">Private</option>
              <option value="COMPANY">Company</option>
            </select>
          </FormField>
          <FormField id="status" label="Status">
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "PROSPECT")}
              className={formSelectClasses}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PROSPECT">Prospect</option>
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="email" label="Email">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={formInputClasses}
            />
          </FormField>
          <FormField id="phone" label="Phone">
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
          label="Address"
          description="Postal address only. Avoid adding notes or sensitive details."
        >
          <textarea
            id="address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={formInputClasses}
          />
        </FormField>
        <FormField id="ownerBrokerId" label="Owner broker">
          <select
            id="ownerBrokerId"
            value={ownerBrokerId}
            onChange={(e) => setOwnerBrokerId(e.target.value)}
            className={formSelectClasses}
          >
            <option value="">— None —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email}
              </option>
            ))}
          </select>
        </FormField>
        <FormActions
          submitLabel={isEdit ? "Save changes" : "Create customer"}
          loadingLabel={isEdit ? "Saving…" : "Creating…"}
          cancelLabel="Cancel"
          onCancel={isEdit && customer ? () => router.push(`/dashboard/customers/${customer.id}`) : undefined}
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}
