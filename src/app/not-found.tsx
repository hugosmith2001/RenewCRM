import Link from "next/link";
import { InlineState, TableShell } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <div className="mt-content-top">
      <TableShell>
        <InlineState
          title="Page not found"
          description="The page you’re looking for doesn’t exist or has moved."
          primaryAction={{ label: "Go to dashboard", href: "/dashboard" }}
          secondaryAction={{ label: "Back to login", href: "/login" }}
        />
        <div className="mt-3 text-center text-sm text-muted-foreground">
          <Link href="/dashboard" className="text-primary hover:underline">
            Return to dashboard
          </Link>
        </div>
      </TableShell>
    </div>
  );
}

