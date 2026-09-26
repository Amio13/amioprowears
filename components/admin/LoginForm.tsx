"use client";

import { LogIn } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signIn } from "@/lib/admin/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          // On success the action redirects, so a result only comes back on failure.
          const result = await signIn({ email: String(form.get("email")), password: String(form.get("password")), next });
          if (!result.ok) setError(result.error);
        });
      }}
    >
      <Input label="Email" name="email" type="email" autoComplete="username" required />
      <Input label="Password" name="password" type="password" autoComplete="current-password" required />
      {error && (
        <p role="alert" className="text-sm text-brand">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {!pending && <LogIn />}
        Log in
      </Button>
    </form>
  );
}
