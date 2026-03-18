import { Button, ButtonLink } from "./button";

type ActionConfig = { label: string; href?: string; onClick?: () => void };

export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description?: React.ReactNode;
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-card">
      <div className="max-w-2xl">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
        {(primaryAction || secondaryAction) && (
          <div className="mt-3 flex flex-wrap items-center gap-form-actions">
            {primaryAction &&
              (primaryAction.onClick ? (
                <Button type="button" variant="primary" size="sm" onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              ) : primaryAction.href ? (
                <ButtonLink href={primaryAction.href} variant="primary" size="sm">
                  {primaryAction.label}
                </ButtonLink>
              ) : null)}
            {secondaryAction &&
              (secondaryAction.onClick ? (
                <Button type="button" variant="secondary" size="sm" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              ) : secondaryAction.href ? (
                <ButtonLink href={secondaryAction.href} variant="secondary" size="sm">
                  {secondaryAction.label}
                </ButtonLink>
              ) : null)}
          </div>
        )}
      </div>
    </div>
  );
}

type InlineActionConfig = { label: string; href?: string; onClick?: () => void };

export function InlineState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description?: React.ReactNode;
  primaryAction?: InlineActionConfig;
  secondaryAction?: InlineActionConfig;
}) {
  return (
    <div className="px-empty-x py-empty-y text-left">
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center gap-form-actions">
          {primaryAction &&
            (primaryAction.onClick ? (
              <Button type="button" variant="primary" size="sm" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            ) : primaryAction.href ? (
              <ButtonLink href={primaryAction.href} variant="primary" size="sm">
                {primaryAction.label}
              </ButtonLink>
            ) : null)}
          {secondaryAction &&
            (secondaryAction.onClick ? (
              <Button type="button" variant="secondary" size="sm" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ) : secondaryAction.href ? (
              <ButtonLink href={secondaryAction.href} variant="secondary" size="sm">
                {secondaryAction.label}
              </ButtonLink>
            ) : null)}
        </div>
      )}
    </div>
  );
}

