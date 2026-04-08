"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PolicyForm } from "./PolicyForm";
import { DetailSection, sectionListClasses, sectionListItemClasses, sectionInnerGapClass } from "@/components/layout";
import { FormError } from "@/components/forms";
import { Badge, Button, ButtonLink, ConfirmDialog } from "@/components/ui";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  PENDING: "Pågående",
  EXPIRED: "Utgången",
  CANCELLED: "Avbruten",
};

type InsuredObject = {
  id: string;
  name: string;
  type: string;
};

type Policy = {
  id: string;
  policyNumber: string;
  insurerId: string;
  insurer: { id: string; name: string };
  premium: number | null;
  startDate: string;
  endDate: string;
  renewalDate: string | null;
  status: string;
  insuredObjects: { insuredObject: { id: string; name: string; type: string } }[];
};

type Props = {
  customerId: string;
  editPolicyId?: string | null;
};

export function PoliciesSection({ customerId, editPolicyId }: Props) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [insuredObjects, setInsuredObjects] = useState<InsuredObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPolicies = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/policies`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPolicies(data);
    } catch {
      setError("Couldn’t load policies.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const fetchInsuredObjects = useCallback(async () => {
    const res = await fetch(`/api/customers/${customerId}/insured-objects`);
    if (res.ok) {
      const data = await res.json();
      setInsuredObjects(data);
    }
  }, [customerId]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    if (showForm || editingPolicy) {
      fetchInsuredObjects();
    }
  }, [showForm, editingPolicy, fetchInsuredObjects]);

  useEffect(() => {
    if (!editPolicyId || loading || policies.length === 0) return;
    const policy = policies.find((p) => p.id === editPolicyId);
    if (policy) {
      setEditingPolicy(policy);
      setShowForm(true);
    }
  }, [editPolicyId, loading, policies]);

  function openAdd() {
    setEditingPolicy(null);
    setShowForm(true);
  }

  function openEdit(policy: Policy) {
    setEditingPolicy(policy);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingPolicy(null);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/customers/${customerId}/policies/${deleteId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchPolicies();
        if (editingPolicy?.id === deleteId) closeForm();
      }
    } catch {
      // ignore
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString();
  }

  return (
    <DetailSection
      id="policies"
      title="Försäkringar"
      actions={
        <Button type="button" onClick={openAdd} variant="primary" size="sm">
          Lägg till försäkring
        </Button>
      }
    >
      {showForm && (
        <div className={sectionInnerGapClass}>
          <PolicyForm
            customerId={customerId}
            policy={editingPolicy}
            insuredObjects={insuredObjects}
            onSuccess={() => {
              fetchPolicies();
              closeForm();
            }}
            onCancel={closeForm}
          />
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Laddar försäkringar…
        </p>
      ) : error ? (
        <FormError message={error} />
      ) : policies.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">
          Inga försäkringar ännu. Lägg till en försäkring för att koppla försäkringsbolag, datum och eventuella försäkrade objekt.
        </p>
      ) : (
        <ul className={sectionListClasses}>
          {policies.map((p) => (
            <li
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-2 ${sectionListItemClasses}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/customers/${customerId}/policies/${p.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {p.policyNumber}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {p.insurer?.name ?? "—"}
                  </span>
                  <Badge
                    tone={
                      p.status === "ACTIVE"
                        ? "success"
                        : p.status === "CANCELLED"
                          ? "danger"
                          : p.status === "PENDING"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0 text-sm text-muted-foreground">
                  <span>
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </span>
                  {p.premium != null && (
                    <span>Premie: {Number(p.premium).toLocaleString()}</span>
                  )}
                  {p.insuredObjects?.length > 0 && (
                    <span>
                      Objekt:{" "}
                      {p.insuredObjects
                        .map((o) => o.insuredObject.name)
                        .join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ButtonLink
                  href={`/dashboard/customers/${customerId}/policies/${p.id}`}
                  variant="ghost"
                  size="sm"
                >
                  Visa
                </ButtonLink>
                <Button
                  type="button"
                  onClick={() => openEdit(p)}
                  variant="ghost"
                  size="sm"
                >
                  Redigera
                </Button>
                <Button
                  type="button"
                  onClick={() => setDeleteId(p.id)}
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
        title="Ta bort försäkring"
        message="Ta bort den här försäkringen? Detta kan inte ångras."
        confirmLabel="Ta bort"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </DetailSection>
  );
}
