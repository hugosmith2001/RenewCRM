"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { DetailSection, sectionListClasses, sectionListItemClasses, sectionInnerGapClass } from "@/components/layout";
import { Badge, Button, ConfirmDialog } from "@/components/ui";

const InsuredObjectForm = dynamic(
  () => import("./InsuredObjectForm").then((m) => m.InsuredObjectForm),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Laddar formulär…</p>
    ),
  }
);

const TYPE_LABELS: Record<string, string> = {
  PROPERTY: "Fastighet",
  VEHICLE: "Fordon",
  PERSON: "Person",
  BUSINESS: "Företag",
  EQUIPMENT: "Utrustning",
  OTHER: "Annat",
};

type InsuredObject = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = { customerId: string; initialObjects?: InsuredObject[] };

export function InsuredObjectsSection({ customerId, initialObjects }: Props) {
  const [objects, setObjects] = useState<InsuredObject[]>(initialObjects ?? []);
  const [loading, setLoading] = useState(initialObjects ? false : true);
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
    if (!initialObjects) fetchObjects();
  }, [fetchObjects, initialObjects]);

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
      title="Försäkrade objekt"
      actions={
        <Button type="button" onClick={openAdd} variant="primary" size="sm">
          Lägg till objekt
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
          Laddar försäkrade objekt…
        </p>
      ) : objects.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">
          Inga försäkrade objekt ännu. Lägg till ett (t.ex. fastighet, fordon) för att komma igång.
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
                  Redigera
                </Button>
                <Button
                  type="button"
                  onClick={() => setDeleteId(o.id)}
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                >
                  Ta bort
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Ta bort försäkrat objekt"
        message="Ta bort det här försäkrade objektet? Detta kan inte ångras."
        confirmLabel="Ta bort"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </DetailSection>
  );
}
