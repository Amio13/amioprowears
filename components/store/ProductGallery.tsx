"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

export interface GalleryImage {
  src: string;
  alt: string;
}

/**
 * Swipeable image gallery: a CSS scroll-snap track (native swipe on phones, no
 * library) with dots on mobile and thumbnails on larger screens.
 */
export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }

  return (
    <div className="md:flex md:flex-row-reverse md:gap-3">
      <div className="relative min-w-0 flex-1">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-roledescription="carousel"
          aria-label="Product photos"
        >
          {images.map((img, i) => (
            <div
              key={img.src}
              className="relative aspect-[4/5] w-full shrink-0 snap-center"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${images.length}`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-contain"
                priority={i === 0}
                unoptimized
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1 md:hidden">
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                onClick={() => goTo(i)}
                className="flex size-6 items-center justify-center"
                aria-label={`Show photo ${i + 1}: ${img.alt}`}
                aria-current={i === active}
              >
                <span
                  className={cn(
                    "block size-2 rounded-full transition-colors",
                    i === active ? "bg-ink" : "bg-neutral-300",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="hidden w-20 shrink-0 flex-col gap-2 md:flex">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden rounded-lg border-2 bg-surface",
                  i === active ? "border-ink" : "border-transparent hover:border-line",
                )}
                aria-label={`Show photo ${i + 1}: ${img.alt}`}
                aria-current={i === active}
              >
                <Image src={img.src} alt="" fill sizes="80px" className="object-contain" unoptimized />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
