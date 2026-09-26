"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export interface GalleryImage {
  src: string;
  alt: string;
  /** Short name for the Front / Back toggle. Unlabelled photos are reached by swiping or thumbnails. */
  label?: string;
  /** Drawn over the photo (customiser print). Must scale with the slide. */
  overlay?: ReactNode;
}

/**
 * Swipeable image gallery: a CSS scroll-snap track (native swipe on phones, no
 * library) with dots on mobile, thumbnails on larger screens, and a Front / Back
 * toggle. `jumpTo` lets the parent flip views (e.g. to the back when a name is typed);
 * change its `key` to trigger a jump.
 */
export function ProductGallery({
  images,
  jumpTo,
  corner,
}: {
  images: GalleryImage[];
  jumpTo?: { index: number; key: number };
  /** Button floating over the top-right corner of the photos. */
  corner?: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const labelled = images.map((img, i) => ({ ...img, index: i })).filter((img) => img.label);

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  }

  useEffect(() => {
    if (jumpTo) goTo(jumpTo.index);
  }, [jumpTo]);

  function onScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }

  return (
    <div className="md:flex md:flex-row-reverse md:gap-3">
      <div className="min-w-0 flex-1">
        <div className="relative">
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
                {img.overlay}
              </div>
            ))}
          </div>

          {corner && <div className="absolute right-2 top-2">{corner}</div>}

          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1 md:hidden">
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

        {labelled.length > 1 && (
          <div className="mt-2 flex justify-center">
            <div className="inline-flex rounded-full bg-surface-strong p-1" role="group" aria-label="Jersey view">
              {labelled.map((img) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => goTo(img.index)}
                  aria-pressed={active === img.index}
                  className={cn(
                    "min-h-11 min-w-20 rounded-full px-5 text-sm font-medium transition-colors",
                    active === img.index ? "bg-white shadow-sm" : "text-muted hover:text-ink",
                  )}
                >
                  {img.label}
                </button>
              ))}
            </div>
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
