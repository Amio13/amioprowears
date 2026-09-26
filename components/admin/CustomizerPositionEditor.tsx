"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { boxStyle, NameNumberOverlay } from "@/components/store/JerseyOverlay";
import { BADGE_POSITION_LABELS } from "@/lib/admin/labels";
import { resolveCustomizer, sanitizeNameInput, sanitizeNumberInput, type ResolvedCustomizer } from "@/lib/customizer";
import type { Badge, BadgePosition, CustomizerConfig, OverlayBox } from "@/types";

const POSITIONS: BadgePosition[] = ["left_chest", "right_chest", "sleeve"];

function Slider({ label, value, min, max, step = 0.5, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full accent-[var(--color-brand)]" />
      <span className="text-right tabular-nums">{value}</span>
    </label>
  );
}

function BoxSliders({ title, box, onChange, withSize }: { title: string; box: OverlayBox; onChange: (b: OverlayBox) => void; withSize?: boolean }) {
  const set = (k: keyof OverlayBox) => (v: number) => onChange({ ...box, [k]: v });
  return (
    <fieldset className="rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <Slider label="Up / down" value={box.top} min={0} max={90} onChange={set("top")} />
      <Slider label="Left / right" value={box.left} min={0} max={100} onChange={set("left")} />
      <Slider label="Width" value={box.width} min={2} max={100} onChange={set("width")} />
      {withSize && <Slider label="Text size" value={box.fontSize ?? 10} min={2} max={50} onChange={set("fontSize")} />}
    </fieldset>
  );
}

/**
 * Fine-tune where the name, number and badges print on this jersey, with a live
 * preview on the real photos. Positions are % of the photo, so they work at any size.
 */
export function CustomizerPositionEditor({
  value,
  onChange,
  imageFront,
  imageBack,
  badges,
  allowNameNumber,
}: {
  value: CustomizerConfig;
  onChange: (c: ResolvedCustomizer) => void;
  imageFront: string | null;
  imageBack: string | null;
  badges: Badge[]; // badges allowed on this product (first one per position is previewed)
  allowNameNumber: boolean;
}) {
  const cfg = resolveCustomizer(value);
  const [side, setSide] = useState<"back" | "front">(allowNameNumber ? "back" : "front");
  const [name, setName] = useState("OKOCHA");
  const [number, setNumber] = useState("10");
  const photo = side === "back" ? imageBack : imageFront;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:sticky md:top-4 md:self-start">
        <div className="mb-2 inline-flex rounded-full bg-surface-strong p-1 text-sm" role="tablist">
          {(["back", "front"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={side === s}
              onClick={() => setSide(s)}
              className={cn("min-h-9 rounded-full px-4 font-medium", side === s && "bg-white shadow-sm")}
            >
              {s === "back" ? "Back (name & number)" : "Front (badges)"}
            </button>
          ))}
        </div>
        <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg bg-surface-strong">
          {photo ? (
            <Image src={photo} alt="" fill sizes="384px" className="object-cover" unoptimized />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
              Upload the {side} photo to see the preview.
            </p>
          )}
          {side === "back" ? (
            <NameNumberOverlay config={cfg} name={name} number={number} />
          ) : (
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {POSITIONS.map((pos) => {
                const badge = badges.find((b) => b.position === pos);
                return badge ? (
                  <Image key={pos} src={badge.image_url} alt="" width={200} height={200} style={boxStyle(cfg.badges[pos])} className="h-auto" unoptimized />
                ) : (
                  <div key={pos} style={{ ...boxStyle(cfg.badges[pos]), aspectRatio: "1" }} className="border-2 border-dashed border-brand/70" />
                );
              })}
            </div>
          )}
        </div>
        {side === "front" && <p className="mt-2 text-xs text-muted">Dashed boxes are badge spots with no badge chosen for this jersey.</p>}
      </div>

      <div className="space-y-3">
        {side === "back" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Sample name" value={name} onChange={(e) => setName(sanitizeNameInput(e.target.value))} />
              <Input label="Sample number" inputMode="numeric" value={number} onChange={(e) => setNumber(sanitizeNumberInput(e.target.value))} />
            </div>
            <BoxSliders title="Name" box={cfg.name} withSize onChange={(b) => onChange({ ...cfg, name: { ...cfg.name, ...b } })} />
            <BoxSliders title="Number" box={cfg.number} withSize onChange={(b) => onChange({ ...cfg, number: { ...cfg.number, ...b } })} />
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm font-medium">
                Print colour
                <input
                  type="color"
                  value={cfg.textColor}
                  onChange={(e) => onChange({ ...cfg, textColor: e.target.value.toUpperCase() })}
                  className="mt-1 block h-11 w-20 cursor-pointer rounded-lg border border-line"
                />
              </label>
              <fieldset className="text-sm">
                <legend className="mb-1 font-medium">Font</legend>
                <div className="flex gap-2">
                  {(["bebas", "oswald"] as const).map((f) => (
                    <label key={f} className={cn("flex min-h-11 cursor-pointer items-center rounded-lg border px-3", cfg.font === f ? "border-ink" : "border-line")}>
                      <input type="radio" name="font" className="sr-only" checked={cfg.font === f} onChange={() => onChange({ ...cfg, font: f })} />
                      <span style={{ fontFamily: `var(--font-${f})` }} className="text-lg">
                        {f === "bebas" ? "Bebas Neue" : "Oswald"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </>
        ) : (
          POSITIONS.map((pos) => (
            <BoxSliders
              key={pos}
              title={`${BADGE_POSITION_LABELS[pos]} badge`}
              box={cfg.badges[pos]}
              onChange={(b) => onChange({ ...cfg, badges: { ...cfg.badges, [pos]: b } })}
            />
          ))
        )}
        <button
          type="button"
          className="min-h-11 text-sm text-muted underline"
          onClick={() => onChange(resolveCustomizer({ textColor: cfg.textColor, font: cfg.font, ...(side === "back" ? { badges: cfg.badges } : { name: cfg.name, number: cfg.number }) }))}
        >
          Reset {side === "back" ? "name & number" : "badge"} positions
        </button>
      </div>
    </div>
  );
}
