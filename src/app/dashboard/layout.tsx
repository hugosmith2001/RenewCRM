import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppShell
        session={{
          user: session.user
            ? {
              email: session.user.email ?? null,
            }
            : undefined,
        }}
      >
        {children}
      </AppShell>
    </div>
  );
}
