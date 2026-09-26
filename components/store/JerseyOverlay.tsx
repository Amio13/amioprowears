import Image from "next/image";
import type { CSSProperties } from "react";
import { fitFontSize, type ResolvedCustomizer } from "@/lib/customizer";
import type { Badge, OverlayBox } from "@/types";

/**
 * Print overlays drawn on top of a jersey photo. Boxes are % of the photo, and
 * text sizes use `cqw` (1% of the container's width), so everything scales with
 * the image on any screen. The parent must be the same size as the photo.
 */

const FONT_FAMILY = {
  bebas: "var(--font-bebas), sans-serif",
  oswald: "var(--font-oswald), sans-serif",
} as const;

export function boxStyle(box: OverlayBox): CSSProperties {
  return {
    position: "absolute",
    top: `${box.top}%`,
    left: `${box.left}%`,
    width: `${box.width}%`,
    transform: "translateX(-50%)",
  };
}

/** Name and number, for the back of the shirt. */
export function NameNumberOverlay({
  config,
  name,
  number,
}: {
  config: ResolvedCustomizer;
  name: string;
  number: string;
}) {
  if (!name && !number) return null;
  const text: CSSProperties = {
    color: config.textColor,
    fontFamily: FONT_FAMILY[config.font],
    // A faint outline keeps white print readable on white shirts and vice versa.
    textShadow: "0 0 0.04em rgb(0 0 0 / 0.35)",
  };

  return (
    <div className="pointer-events-none absolute inset-0 @container" aria-hidden="true">
      {name && (
        <span
          className="block whitespace-nowrap text-center uppercase leading-none tracking-[0.06em]"
          style={{ ...boxStyle(config.name), ...text, fontSize: `${fitFontSize(name, config.name, config.font)}cqw` }}
        >
          {name}
        </span>
      )}
      {number && (
        <span
          className="block text-center leading-none"
          style={{ ...boxStyle(config.number), ...text, fontSize: `${config.number.fontSize}cqw` }}
        >
          {number}
        </span>
      )}
    </div>
  );
}

/** One badge at its position (left chest, right chest or sleeve) on the front. */
export function BadgeOverlay({ config, badge }: { config: ResolvedCustomizer; badge: Badge | null }) {
  if (!badge) return null;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Image
        src={badge.image_url}
        alt=""
        width={200}
        height={200}
        style={boxStyle(config.badges[badge.position])}
        className="h-auto"
        unoptimized
      />
    </div>
  );
}
