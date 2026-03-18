"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import {
  FormLayout,
  FormField,
  FormError,
  FormActions,
  formInputClasses,
  formSelectClasses,
  formCheckboxClasses,
} from "@/components/forms";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type Insurer = { id: string; name: string };
type InsuredObject = { id: string; name: string; type: string };

type Policy = {
  id: string;
  policyNumber: string;
  insurerId: string;
  insurer?: { id: string; name: string };
  premium: number | null;
  startDate: string;
  endDate: string;
  renewalDate: string | null;
  status: string;
  insuredObjects?: { insuredObject: { id: string; name: string; type: string } }[];
};

export type PolicyFormData = {
  insurerId: string;
  policyNumber: string;
  premium: string;
  startDate: string;
  endDate: string;
  renewalDate: string;
  status: string;
  insuredObjectIds: string[];
};

type Props = {
  customerId: string;
  policy?: Policy | null;
  insuredObjects: InsuredObject[];
  onSuccess: () => void;
  onCancel: () => void;
};

const emptyForm: PolicyFormData = {
  insurerId: "",
  policyNumber: "",
  premium: "",
  startDate: "",
  endDate: "",
  renewalDate: "",
  status: "ACTIVE",
  insuredObjectIds: [],
};

function formatDateForInput(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function PolicyForm({
  customerId,
  policy,
  insuredObjects,
  onSuccess,
  onCancel,
}: Props) {
  const [form, setForm] = useState<PolicyFormData>(emptyForm);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [newInsurerName, setNewInsurerName] = useState("");
  const [addingInsurer, setAddingInsurer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!policy;

  const fetchInsurers = async () => {
    const res = await fetch("/api/insurers");
    if (res.ok) {
      const data = await res.json();
      setInsurers(data);
    }
  };

  useEffect(() => {
    fetchInsurers();
  }, []);

  useEffect(() => {
    if (policy) {
      setForm({
        insurerId: policy.insurerId ?? policy.insurer?.id ?? "",
        policyNumber: policy.policyNumber ?? "",
        premium: policy.premium != null ? String(policy.premium) : "",
        startDate: formatDateForInput(policy.startDate),
        endDate: formatDateForInput(policy.endDate),
        renewalDate: formatDateForInput(policy.renewalDate),
        status: policy.status ?? "ACTIVE",
        insuredObjectIds:
          policy.insuredObjects?.map((o) => o.insuredObject.id) ?? [],
      });
    } else {
      setForm(emptyForm);
    }
  }, [policy]);

  async function handleAddInsurer(e: React.FormEvent) {
    e.preventDefault();
    if (!newInsurerName.trim()) return;
    setAddingInsurer(true);
    setError(null);
    try {
      const res = await fetch("/api/insurers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newInsurerName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add insurer");
      }
      const created = await res.json();
      setInsurers((prev) => [...prev, created]);
      setForm((p) => ({ ...p, insurerId: created.id }));
      setNewInsurerName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add insurer");
    } finally {
      setAddingInsurer(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        insurerId: form.insurerId,
        policyNumber: form.policyNumber.trim(),
        premium: form.premium.trim() ? Number(form.premium) : undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        renewalDate: form.renewalDate.trim() || undefined,
        status: form.status,
        insuredObjectIds: form.insuredObjectIds,
      };
      if (isEdit && policy) {
        const res = await fetch(
          `/api/customers/${customerId}/policies/${policy.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update policy");
        }
      } else {
        const res = await fetch(`/api/customers/${customerId}/policies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to add policy");
        }
      }
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleInsuredObject(id: string) {
    setForm((p) =>
      p.insuredObjectIds.includes(id)
        ? { ...p, insuredObjectIds: p.insuredObjectIds.filter((x) => x !== id) }
        : { ...p, insuredObjectIds: [...p.insuredObjectIds, id] }
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormLayout variant="embedded">
        {error && <FormError message={error} />}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <FormField id="policy-insurer" label="Insurer" required>
              <select
                id="policy-insurer"
                required
                value={form.insurerId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, insurerId: e.target.value }))
                }
                className={formSelectClasses}
              >
                <option value="">Select insurer</option>
                {insurers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New insurer name"
              value={newInsurerName}
              onChange={(e) => setNewInsurerName(e.target.value)}
              className={`${formInputClasses} min-w-[140px]`}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddInsurer}
              disabled={addingInsurer || !newInsurerName.trim()}
            >
              {addingInsurer ? "Adding…" : "Add insurer"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="policy-number" label="Policy number" required>
            <input
              id="policy-number"
              type="text"
              required
              value={form.policyNumber}
              onChange={(e) =>
                setForm((p) => ({ ...p, policyNumber: e.target.value }))
              }
              placeholder="e.g. POL-2024-001"
              className={formInputClasses}
            />
          </FormField>
          <FormField id="policy-premium" label="Premium">
            <input
              id="policy-premium"
              type="number"
              min={0}
              step={0.01}
              value={form.premium}
              onChange={(e) =>
                setForm((p) => ({ ...p, premium: e.target.value }))
              }
              placeholder="0.00"
              className={formInputClasses}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="policy-start" label="Start date" required>
            <input
              id="policy-start"
              type="date"
              required
              value={form.startDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, startDate: e.target.value }))
              }
              className={formInputClasses}
            />
          </FormField>
          <FormField id="policy-end" label="End date" required>
            <input
              id="policy-end"
              type="date"
              required
              value={form.endDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, endDate: e.target.value }))
              }
              className={formInputClasses}
            />
          </FormField>
          <FormField id="policy-renewal" label="Renewal date">
            <input
              id="policy-renewal"
              type="date"
              value={form.renewalDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, renewalDate: e.target.value }))
              }
              className={formInputClasses}
            />
          </FormField>
        </div>

        <FormField id="policy-status" label="Status">
          <select
            id="policy-status"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className={`${formSelectClasses} sm:max-w-[200px]`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </FormField>

        {insuredObjects.length > 0 && (
          <div className="space-y-form-group">
            <span className="block text-sm font-medium text-foreground">
              Link to insured objects
            </span>
            <ul className="space-y-2">
              {insuredObjects.map((obj) => (
                <li key={obj.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`obj-${obj.id}`}
                    checked={form.insuredObjectIds.includes(obj.id)}
                    onChange={() => toggleInsuredObject(obj.id)}
                    className={formCheckboxClasses}
                  />
                  <label
                    htmlFor={`obj-${obj.id}`}
                    className="text-sm text-foreground"
                  >
                    {obj.name}
                    <span className="ml-1 text-muted-foreground">
                      ({obj.type})
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <FormActions
          submitLabel={isEdit ? "Save changes" : "Add policy"}
          onCancel={onCancel}
          loading={loading}
        />
      </FormLayout>
    </form>
  );
}
