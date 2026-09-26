import { useId, type CSSProperties } from "react";
import { fitFontSize, NAME_CURVES, type ResolvedCustomizer } from "@/lib/customizer";
import { jerseyFontFamily } from "@/lib/jersey-fonts";
import type { OverlayBox } from "@/types";

/**
 * Print overlays drawn on top of a jersey photo. Boxes are % of the photo, and
 * text sizes use `cqw` (1% of the container's width), so everything scales with
 * the image on any screen. The parent must be the same size as the photo.
 * Badges are not drawn: customers see them as pictures in the badge picker, and the
 * owner places them when printing.
 */

type PrintConfig = Pick<ResolvedCustomizer, "name" | "number" | "textColor" | "font" | "curve">;

export function boxStyle(box: OverlayBox): CSSProperties {
  return {
    position: "absolute",
    top: `${box.top}%`,
    left: `${box.left}%`,
    width: `${box.width}%`,
    transform: "translateX(-50%)",
  };
}

// A faint outline keeps white print readable on white shirts and vice versa.
const OUTLINE = "0 0 0.04em rgb(0 0 0 / 0.35)";

/** Name and number, for the back of the shirt. */
export function NameNumberOverlay({ config, name, number }: { config: PrintConfig; name: string; number: string }) {
  if (!name && !number) return null;
  const text: CSSProperties = { color: config.textColor, fontFamily: jerseyFontFamily(config.font), textShadow: OUTLINE };
  const nameSize = fitFontSize(name, config.name, config.font);

  return (
    <div className="pointer-events-none absolute inset-0 @container" aria-hidden="true">
      {name &&
        (config.curve === "none" ? (
          <span
            className="block whitespace-nowrap text-center uppercase leading-none tracking-[0.06em]"
            style={{ ...boxStyle(config.name), ...text, fontSize: `${nameSize}cqw` }}
          >
            {name}
          </span>
        ) : (
          <CurvedName text={name} box={config.name} fontSize={nameSize} sag={NAME_CURVES[config.curve].sag} style={text} />
        ))}
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

/**
 * The name along an upward arch, like many real kits. Drawn as SVG text on a curve:
 * the box width is 100 units, the arc's ends sit `sag` × width below its middle, and
 * the middle letters sit where a straight name would, so switching curve doesn't
 * move the name.
 */
function CurvedName({
  text,
  box,
  fontSize,
  sag,
  style,
}: {
  text: string;
  box: Required<OverlayBox>;
  /** % of photo width, as for straight text. */
  fontSize: number;
  sag: number;
  style: CSSProperties;
}) {
  const id = useId();
  const fu = (fontSize / box.width) * 100; // font size in SVG units
  const rise = sag * 100;
  const baseline = 0.8 * fu; // where a straight name's baseline sits (leading-none)
  const ends = baseline + rise;
  const height = ends + 0.25 * fu;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      style={{ ...boxStyle(box), height: "auto", overflow: "visible", filter: `drop-shadow(${OUTLINE.replace("0.04em", "0.03em")})` }}
    >
      <path id={id} d={`M 0 ${ends} Q 50 ${ends - 2 * rise} 100 ${ends}`} fill="none" />
      <text fill={style.color} textAnchor="middle" style={{ fontFamily: style.fontFamily, fontSize: fu, letterSpacing: "0.06em" }}>
        <textPath href={`#${id}`} startOffset="50%">
          {text}
        </textPath>
      </text>
    </svg>
  );
}
