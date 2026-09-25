import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-3xl leading-none tracking-wide ${className}`}
      aria-label="Amioprowears home"
    >
      <span className="text-brand">AMIO</span>PROWEARS
    </Link>
  );
}
