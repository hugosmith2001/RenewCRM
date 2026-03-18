type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

function toneClasses(tone: BadgeTone) {
  switch (tone) {
    case "success":
      return "bg-status-success-bg text-status-success";
    case "warning":
      return "bg-status-warning-bg text-status-warning";
    case "danger":
      return "bg-status-danger-bg text-status-danger";
    case "info":
      return "bg-primary-muted text-primary";
    case "neutral":
    default:
      return "bg-surface-muted text-muted-foreground";
  }
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-sm border border-transparent px-2 py-0.5 text-xs font-medium",
        toneClasses(tone),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

