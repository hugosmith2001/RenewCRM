export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["overflow-hidden rounded-card border border-border bg-surface", className].filter(Boolean).join(" ")}>
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={["min-w-full divide-y divide-border", className].filter(Boolean).join(" ")}>{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-surface-muted">{children}</thead>;
}

export function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={[
        "px-table-cell-x py-table-cell-y-header text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border bg-surface">{children}</tbody>;
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={["hover:bg-surface-muted", className].filter(Boolean).join(" ")}>{children}</tr>;
}

export function TD({
  children,
  className,
  title,
  ...rest
}: { children: React.ReactNode; className?: string; title?: string } & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={["whitespace-nowrap px-table-cell-x py-table-cell-y text-sm", className].filter(Boolean).join(" ")}
      title={title}
      {...rest}
    >
      {children}
    </td>
  );
}

