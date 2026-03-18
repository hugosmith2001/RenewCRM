import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col justify-center px-content-x py-content-y">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold text-foreground">
          Safekeep CRM
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Insurance broker CRM. Sign in to continue.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
