"use client";

import { useState, useEffect, useCallback } from "react";
import { InsuredObjectForm } from "./InsuredObjectForm";
import { DetailSection, sectionListClasses, sectionListItemClasses, sectionInnerGapClass } from "@/components/layout";
import { Badge, Button, ConfirmDialog } from "@/components/ui";

const TYPE_LABELS: Record<string, string> = {
  PROPERTY: "Property",
  VEHICLE: "Vehicle",
  PERSON: "Person",
  BUSINESS: "Business",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

type InsuredObject = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = { customerId: string };

export function InsuredObjectsSection({ customerId }: Props) {
  const [objects, setObjects] = useState<InsuredObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingObject, setEditingObject] = useState<InsuredObject | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchObjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/insured-objects`);
      if (res.ok) {
        const data = await res.json();
        setObjects(data);
      }
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  function openAdd() {
    setEditingObject(null);
    setShowForm(true);
  }

  function openEdit(obj: InsuredObject) {
    setEditingObject(obj);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingObject(null);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/customers/${customerId}/insured-objects/${deleteId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchObjects();
        if (editingObject?.id === deleteId) closeForm();
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
      id="insured-objects"
      title="Insured objects"
      actions={
        <Button type="button" onClick={openAdd} variant="primary" size="sm">
          Add object
        </Button>
      }
    >
      {showForm && (
        <div className={sectionInnerGapClass}>
          <InsuredObjectForm
            customerId={customerId}
            object={editingObject}
            onSuccess={() => {
              fetchObjects();
              closeForm();
            }}
            onCancel={closeForm}
          />
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading insured objects…
        </p>
      ) : objects.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">
          No insured objects yet. Add one (e.g. property, vehicle) to get
          started.
        </p>
      ) : (
        <ul className={sectionListClasses}>
          {objects.map((o) => (
            <li
              key={o.id}
              className={`flex flex-wrap items-center justify-between gap-2 ${sectionListItemClasses}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {o.name}
                  </span>
                  <Badge tone="neutral">
                    {TYPE_LABELS[o.type] ?? o.type}
                  </Badge>
                </div>
                {o.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                    {o.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => openEdit(o)}
                  variant="ghost"
                  size="sm"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  onClick={() => setDeleteId(o.id)}
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
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
        title="Remove insured object"
        message="Remove this insured object? This cannot be undone."
        confirmLabel="Remove"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </DetailSection>
  );
}
