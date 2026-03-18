"use client";

import { useState, useEffect, useCallback } from "react";
import { ContactForm } from "./ContactForm";
import { DetailSection, sectionListClasses, sectionListItemClasses, sectionInnerGapClass } from "@/components/layout";
import { Badge, Button, ConfirmDialog } from "@/components/ui";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

type Props = { customerId: string };

export function ContactPersonsSection({ customerId }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function openAdd() {
    setEditingContact(null);
    setShowForm(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingContact(null);
  }

  async function handleSetPrimary(contactId: string) {
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts/${contactId}/primary`, {
        method: "POST",
      });
      if (res.ok) await fetchContacts();
    } catch {
      // ignore
    }
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchContacts();
        if (editingContact?.id === deleteId) closeForm();
      }
    } catch {
      // ignore
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }

  return (
    <DetailSection
      id="contact-persons"
      title="Contact persons"
      actions={
        <Button type="button" onClick={openAdd} variant="primary" size="sm">
          Add contact
        </Button>
      }
    >
      {showForm && (
        <div className={sectionInnerGapClass}>
          <ContactForm
            customerId={customerId}
            contact={editingContact}
            onSuccess={() => {
              fetchContacts();
              closeForm();
            }}
            onCancel={closeForm}
          />
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading contacts…</p>
      ) : contacts.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">
          No contact persons yet. Add one to get started.
        </p>
      ) : (
        <ul className={sectionListClasses}>
          {contacts.map((c) => (
            <li
              key={c.id}
              className={`flex flex-wrap items-center justify-between gap-2 ${sectionListItemClasses}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {c.name}
                  </span>
                  {c.isPrimary && (
                    <Badge tone="info">Primary</Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0 text-sm text-muted-foreground">
                  {c.title && <span>{c.title}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!c.isPrimary && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPrimary(c.id)}
                  >
                    Set primary
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(c)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => setDeleteId(c.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Remove contact"
        message="Remove this contact from the customer? This cannot be undone."
        confirmLabel="Remove"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </DetailSection>
  );
}
