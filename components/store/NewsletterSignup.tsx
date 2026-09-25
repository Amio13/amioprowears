"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterSignup() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          email: form.get("email"),
          source: "footer",
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setMessage("You're in. Watch your inbox for new drops and deals.");
    } catch {
      setStatus("error");
      setMessage("We couldn't sign you up just now. Please try again later.");
    }
  }

  if (status === "success") {
    return (
      <p role="status" className="text-sm">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate={false}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="First name" name="firstName" autoComplete="given-name" maxLength={50} />
        <Input label="Email" name="email" type="email" autoComplete="email" required />
      </div>
      <Button type="submit" loading={status === "loading"} className="w-full sm:w-auto">
        Sign up
      </Button>
      {status === "error" && (
        <p role="alert" className="text-sm text-brand">
          {message}
        </p>
      )}
    </form>
  );
}
