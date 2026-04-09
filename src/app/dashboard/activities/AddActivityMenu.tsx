"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui";

type Props = {
  className?: string;
};

export function AddActivityMenu({ className }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDocKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onDocKeyDown);
    return () => document.removeEventListener("keydown", onDocKeyDown);
  }, [open]);

  return (
    <>
      <div className={["inline-flex", className].filter(Boolean).join(" ")}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Lägg till aktivitet
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-activity-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-surface p-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-activity-title" className="text-sm font-semibold text-foreground">
              Lägg till aktivitet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Aktiviteter loggas på kundsidor. Välj om du vill skapa en ny kund eller lägga till på en befintlig kund.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <ButtonLink href="/dashboard/customers/new" variant="primary" onClick={() => setOpen(false)}>
                Skapa ny kund
              </ButtonLink>
              <ButtonLink href="/dashboard/customers" variant="secondary" onClick={() => setOpen(false)}>
                Lägg till på befintlig kund
              </ButtonLink>
              <div className="pt-1">
                <Button type="button" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                  Avbryt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

