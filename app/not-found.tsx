import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-7xl text-brand">404</p>
      <h1 className="text-2xl font-bold">We can&apos;t find that page</h1>
      <p className="text-muted">It may have moved, or it isn&apos;t live yet.</p>
      <Link href="/" className={buttonClasses()}>
        Back to the store
      </Link>
    </main>
  );
}
