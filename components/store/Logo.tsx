import Image from "next/image";
import Link from "next/link";

/** The Amioprowears logo image (public/logo.webp, 506×160). Height sets the size. */
export function LogoImage({ className = "h-10", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.webp"
      alt="Amioprowears"
      width={506}
      height={160}
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}

export function Logo({
  className = "",
  imageClassName,
  priority = false,
}: {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  return (
    <Link href="/" className={`flex items-center ${className}`} aria-label="Amioprowears home">
      <LogoImage className={imageClassName} priority={priority} />
    </Link>
  );
}
