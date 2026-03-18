import React from "react";

/**
 * Reusable section for detail/workspace pages. Keeps headers and card styling
 * consistent. Uses theme tokens only (no hardcoded colors or fonts).
 *
 * For list content inside the body, use sectionListClasses on the ul and
 * sectionListItemClasses on each li (merge with your existing flex/gap classes).
 */

type DetailSectionProps = {
  /** Optional id for anchor links (e.g. #policies) */
  id?: string;
  title: string;
  /** Optional actions (e.g. "Add contact", "Upload") shown in header */
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Shared spacing: use on the wrapper div that separates form from list (e.g. mb-section-inner). */
export const sectionInnerGapClass = "mb-section-inner";

/** Use on <ul> for section lists (divide-y + border). */
export const sectionListClasses = "divide-y divide-border";

/** Use on each <li> with sectionListClasses (row padding; combine with flex/gap as needed). */
export const sectionListItemClasses = "py-section-list-row first:pt-0 last:pb-0";

export function DetailSection({ id, title, actions, children }: DetailSectionProps) {
  return (
    <section
      id={id}
      className="rounded-card border border-border bg-surface"
    >
      <div className="flex items-center justify-between border-b border-border px-section-header-x py-section-header-y">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h2>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="p-section-body">
        {children}
      </div>
    </section>
  );
}
