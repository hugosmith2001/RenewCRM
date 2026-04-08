import { auth } from "@/auth";
import { signOutAction } from "@/app/login/actions";

export async function TopBar() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return (
    <header className="fixed left-sidebar right-0 top-0 z-20 flex h-topbar min-h-topbar items-center justify-between border-b border-border bg-surface px-content-x">
      <div className="min-w-0 flex-1" />
      <div className="flex shrink-0 items-center gap-4">
        <span className="truncate text-sm text-muted-foreground">
          {session.user.email}
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
