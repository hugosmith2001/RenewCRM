"use client";

import { useState, useEffect } from "react";
import {
  FormLayout,
  FormField,
  FormError,
  FormActions,
  formInputClasses,
  formCheckboxClasses,
} from "@/components/forms";

export type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  title: string;
  isPrimary: boolean;
};

type Props = {
  customerId: string;
  contact?: { id: string; name: string; email: string | null; phone: string | null; title: string | null; isPrimary: boolean } | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const emptyForm: ContactFormData = {
  name: "",
  email: "",
  phone: "",
  title: "",
  isPrimary: false,
};

export function ContactForm({ customerId, contact, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!contact;

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        title: contact.title ?? "",
        isPrimary: contact.isPrimary,
      });
    } else {
      setForm(emptyForm);
    }
  }, [contact]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        title: form.title.trim() || undefined,
        isPrimary: form.isPrimary,
      };
      if (isEdit && contact) {
        const res = await fetch(`/api/customers/${customerId}/contacts/${contact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update contact");
        }
      } else {
        const res = await fetch(`/api/customers/${customerId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to add contact");
        }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLayout variant="embedded">
        {error && <FormError message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="contact-name" label="Name" required>
            <input
              id="contact-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={formInputClasses}
            />
          </FormField>
          <FormField id="contact-email" label="Email">
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className={formInputClasses}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="contact-phone" label="Phone">
            <input
              id="contact-phone"
              type="text"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className={formInputClasses}
            />
          </FormField>
          <FormField id="contact-title" label="Title / role">
            <input
              id="contact-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className={formInputClasses}
            />
          </FormField>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="contact-primary"
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => setForm((p) => ({ ...p, isPrimary: e.target.checked }))}
            className={formCheckboxClasses}
          />
          <label htmlFor="contact-primary" className="text-sm text-foreground">
            Primary contact
          </label>
        </div>
        <FormActions
          submitLabel={isEdit ? "Save changes" : "Add contact"}
          onCancel={onCancel}
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}
