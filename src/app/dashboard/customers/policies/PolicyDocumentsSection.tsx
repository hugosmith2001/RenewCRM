"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DetailSection, sectionListClasses, sectionListItemClasses } from "@/components/layout";
import { Badge, Button, ConfirmDialog } from "@/components/ui";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  POLICY_DOCUMENT: "Policy document",
  CONTRACT: "Contract",
  ID_DOCUMENT: "ID document",
  CORRESPONDENCE: "Correspondence",
  OTHER: "Other",
};

type Document = {
  id: string;
  name: string;
  documentType: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string | Date;
};

type Props = {
  customerId: string;
  documents: Document[];
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PolicyDocumentsSection({ customerId, documents }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/customers/${customerId}/documents/${deleteId}`,
        { method: "DELETE" }
      );
      if (res.ok) router.refresh();
    } catch {
      // ignore
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }

  return (
    <DetailSection id="documents" title="Documents">
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents linked to this policy. Upload from the customer workspace
          and link to this policy.
        </p>
      ) : (
        <ul className={sectionListClasses}>
          {documents.map((d) => (
            <li
              key={d.id}
              className={`flex flex-wrap items-center justify-between gap-2 ${sectionListItemClasses}`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{d.name}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0 text-sm text-muted-foreground">
                  <Badge tone="neutral">
                    {DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}
                  </Badge>
                  <span>{formatSize(d.sizeBytes)}</span>
                  <span>
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/customers/${customerId}/documents/${d.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Download
                </a>
                <Button
                  type="button"
                  onClick={() => setDeleteId(d.id)}
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
        title="Delete document"
        message="Delete this document? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </DetailSection>
  );
}
