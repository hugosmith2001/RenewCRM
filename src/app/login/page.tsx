"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import {
  FormLayout,
  FormField,
  FormError,
  formInputClasses,
} from "@/components/forms";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Ogiltig e-postadress eller lösenord.");
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Något gick fel. Försök igen.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-foreground">
          Logga in till Renew CRM
        </h1>
        <form onSubmit={handleSubmit} className="mt-6">
          <FormLayout variant="card" className="max-w-sm">
            {error && <FormError message={error} />}
            <FormField id="email" label="E-post" required>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={formInputClasses}
              />
            </FormField>
            <FormField id="password" label="Lösenord" required>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={formInputClasses}
              />
            </FormField>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Loggar in…" : "Logga in"}
            </Button>
          </FormLayout>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm rounded-card border border-border bg-surface p-card">
          <p className="text-muted-foreground">Laddar…</p>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
