import Link from "next/link";

type CommonProps = {
  className?: string;
  children: React.ReactNode;
};

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

function baseClasses(size: ButtonSize) {
  return [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-sm font-medium",
    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-ring-offset",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-sm" : "h-9 px-4 text-sm",
  ].join(" ");
}

function variantClasses(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return "bg-primary text-primary-foreground hover:bg-primary-hover";
    case "secondary":
      return "border border-border bg-surface text-foreground hover:bg-surface-muted";
    case "danger":
      return "bg-danger text-primary-foreground hover:bg-danger/90";
    case "ghost":
    default:
      return "text-muted-foreground hover:bg-surface-muted hover:text-foreground";
  }
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }) {
  return (
    <button
      {...props}
      className={[baseClasses(size), variantClasses(variant), className].filter(Boolean).join(" ")}
    />
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: CommonProps & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={[baseClasses(size), variantClasses(variant), className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

