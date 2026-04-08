"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog } from "@/components/ui";

export function PurgeCustomerButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = useMemo(() => {
    return `Detta raderar ${customerName} permanent och relaterade poster (inklusive dokument). Detta kan inte ångras.`;
  }, [customerName]);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/purge`, { method: "POST" });
      if (!res.ok) {
        let serverError: string | undefined;
        try {
          const data = (await res.json()) as { error?: string };
          serverError = data?.error;
        } catch {
          // ignore JSON parse failures
        }

        if (res.status === 423) {
          setError(serverError ?? "Kunden är spärrad och kan inte tas bort.");
          return;
        }
        if (res.status === 409) {
          setError(serverError ?? "Kunden har rättslig spärr och kan inte tas bort.");
          return;
        }
        if (res.status === 404) {
          setError(serverError ?? "Kunden hittades inte.");
          return;
        }
        setError(serverError ?? "Det gick inte att ta bort kunden.");
        return;
      }

      setOpen(false);
      router.push("/dashboard/customers");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-sm text-danger">{error}</span> : null}
      <Button variant="danger" onClick={() => setOpen(true)}>
        Ta bort kund
      </Button>
      <ConfirmDialog
        open={open}
        title="Ta bort kund?"
        message={message}
        confirmLabel="Ta bort"
        cancelLabel="Avbryt"
        variant="danger"
        loading={loading}
        onCancel={() => {
          if (loading) return;
          setOpen(false);
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

