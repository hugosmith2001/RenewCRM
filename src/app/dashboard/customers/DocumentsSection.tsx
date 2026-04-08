"use client";

import { useState, useEffect, useCallback } from "react";
import { DetailSection, sectionListClasses, sectionListItemClasses, sectionInnerGapClass } from "@/components/layout";
import { Badge, Button, ConfirmDialog } from "@/components/ui";
import { FormError, FormField, FormLayout, formInputClasses, formSelectClasses } from "@/components/forms";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  POLICY_DOCUMENT: "Försäkringsdokument",
  CONTRACT: "Avtal",
  ID_DOCUMENT: "ID-handling",
  CORRESPONDENCE: "Korrespondens",
  OTHER: "Annat",
};

type Policy = { id: string; policyNumber: string };

type Document = {
  id: string;
  name: string;
  documentType: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  policyId: string | null;
  policy: { id: string; policyNumber: string } | null;
};

type Props = { customerId: string };

export function DocumentsSection({ customerId }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/documents`);
      if (!res.ok) throw new Error("Det gick inte att läsa in dokument");
      const data = await res.json();
      setDocuments(data);
    } catch {
      setError("Det gick inte att läsa in dokument.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const fetchPolicies = useCallback(async () => {
    const res = await fetch(`/api/customers/${customerId}/policies`);
    if (res.ok) {
      const data = await res.json();
      setPolicies(data);
    }
  }, [customerId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (showForm) fetchPolicies();
  }, [showForm, fetchPolicies]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      setError("Välj en fil.");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Uppladdningen misslyckades");
        return;
      }
      await fetchDocuments();
      setShowForm(false);
      form.reset();
    } catch {
      setError("Uppladdningen misslyckades");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/customers/${customerId}/documents/${deleteId}`,
        { method: "DELETE" }
      );
      if (res.ok) await fetchDocuments();
    } catch {
      // ignore
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <DetailSection
      id="documents"
      title="Dokument"
      actions={
        <Button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "secondary" : "primary"}
          size="sm"
        >
          {showForm ? "Avbryt" : "Ladda upp dokument"}
        </Button>
      }
    >
        {showForm && (
          <form onSubmit={handleSubmit} className={sectionInnerGapClass}>
            <FormLayout variant="embedded">
              {error && <FormError message={error} />}
              <FormField id="doc-file" label="Fil" required description="PDF, bilder, Word, text, CSV. Max 20 MB.">
                <input
                  id="doc-file"
                  name="file"
                  type="file"
                  required
                  className="block w-full text-sm text-foreground file:mr-4 file:rounded-sm file:border-0 file:bg-primary-muted file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                />
              </FormField>
              <FormField id="doc-name" label="Visningsnamn">
                <input
                  id="doc-name"
                  name="name"
                  type="text"
                  placeholder="t.ex. Försäkringsbrev 2024"
                  className={formInputClasses}
                />
              </FormField>
              <FormField id="doc-type" label="Typ">
                <select
                  id="doc-type"
                  name="documentType"
                  className={formSelectClasses}
                >
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              {policies.length > 0 && (
                <FormField id="doc-policy" label="Koppla till försäkring (valfritt)">
                  <select
                    id="doc-policy"
                    name="policyId"
                    className={formSelectClasses}
                  >
                    <option value="">— Ingen —</option>
                    {policies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.policyNumber}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
              <div className="flex flex-wrap items-center gap-form-actions">
                <Button type="submit" variant="primary" disabled={uploading}>
                  {uploading ? "Laddar upp…" : "Ladda upp"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Avbryt
                </Button>
              </div>
            </FormLayout>
          </form>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Laddar dokument…
          </p>
        ) : error ? (
          <FormError message={error} />
        ) : documents.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">
            Inga dokument ännu. Ladda upp försäkrings-PDF:er, avtal eller andra filer och koppla dem vid behov till en försäkring.
          </p>
        ) : (
          <ul className={sectionListClasses}>
            {documents.map((d) => (
              <li
                key={d.id}
                className={`flex flex-wrap items-center justify-between gap-2 ${sectionListItemClasses}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">
                    {d.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0 text-sm text-muted-foreground">
                    <Badge tone="neutral">
                      {DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}
                    </Badge>
                    <span>{formatSize(d.sizeBytes)}</span>
                    <span>
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                    {d.policy && (
                      <span>Försäkring: {d.policy.policyNumber}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/customers/${customerId}/documents/${d.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Ladda ner
                  </a>
                  <Button
                    type="button"
                    onClick={() => setDeleteId(d.id)}
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
        title="Ta bort dokument"
        message="Ta bort det här dokumentet? Detta kan inte ångras."
        confirmLabel="Ta bort"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </DetailSection>
  );
}
