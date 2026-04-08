"use client";

import { useState, useEffect, useCallback } from "react";
import { ActivityForm } from "./ActivityForm";
import { DetailSection, sectionListClasses, sectionListItemClasses, sectionInnerGapClass } from "@/components/layout";
import { FormError } from "@/components/forms";
import { Badge, Button, ConfirmDialog } from "@/components/ui";

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Samtal",
  MEETING: "Möte",
  EMAIL: "E-post",
  NOTE: "Anteckning",
  ADVICE: "Rådgivning",
};

type Activity = {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string } | null;
};

type Props = { customerId: string };

export function ActivitiesSection({ customerId }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/activities`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setActivities(data);
    } catch {
      setError("Det gick inte att läsa in aktiviteter.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  function openAdd() {
    setEditingActivity(null);
    setShowForm(true);
  }

  function openEdit(activity: Activity) {
    setEditingActivity(activity);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingActivity(null);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/activities/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchActivities();
        if (editingActivity?.id === deleteId) closeForm();
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
      id="activities"
      title="Aktiviteter"
      actions={
        <Button type="button" onClick={openAdd} variant="primary" size="sm">
          Logga aktivitet
        </Button>
      }
    >
      {showForm && (
        <div className={sectionInnerGapClass}>
          <ActivityForm
            customerId={customerId}
            activity={editingActivity}
            onSuccess={() => {
              fetchActivities();
              closeForm();
            }}
            onCancel={closeForm}
          />
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Laddar aktiviteter…
        </p>
      ) : error ? (
        <FormError message={error} />
      ) : activities.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">
          Inga aktiviteter ännu. Logga ett samtal, möte, e-post eller en anteckning för att följa kommunikationen.
        </p>
      ) : (
        <ul className={sectionListClasses}>
          {activities.map((a) => (
            <li
              key={a.id}
              className={`flex flex-wrap items-start justify-between gap-2 ${sectionListItemClasses}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">
                    {ACTIVITY_TYPE_LABELS[a.type] ?? a.type}
                  </Badge>
                  {a.subject && (
                    <span className="font-medium text-foreground">
                      {a.subject}
                    </span>
                  )}
                </div>
                {a.body && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {a.body}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0 text-xs text-muted-foreground">
                  <span>
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                  {a.createdBy && (
                    <span>
                      {a.createdBy.name ?? a.createdBy.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => openEdit(a)}
                  variant="ghost"
                  size="sm"
                >
                  Redigera
                </Button>
                <Button
                  type="button"
                  onClick={() => setDeleteId(a.id)}
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
        title="Ta bort aktivitet"
        message="Ta bort den här aktiviteten? Detta kan inte ångras."
        confirmLabel="Ta bort"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </DetailSection>
  );
}
