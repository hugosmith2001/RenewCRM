export function ListToolbar({
  left,
  right,
  className,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex flex-wrap items-end justify-between gap-toolbar",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0 flex-1">{left}</div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

