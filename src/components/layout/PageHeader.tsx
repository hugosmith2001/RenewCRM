import Link from "next/link";

type PageHeaderProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  /** Optional description or subtitle below title */
  description?: React.ReactNode;
};

export function PageHeader({
  title,
  backHref,
  backLabel = "Back",
  actions,
  description,
}: PageHeaderProps) {
  return (
    <div className="mb-page-header flex flex-col gap-page-header-gap sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 block text-sm text-muted-foreground hover:text-foreground"
          >
            ← {backLabel}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <div className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
