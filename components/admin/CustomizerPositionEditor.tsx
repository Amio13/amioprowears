"use client";

import { RotateCcw } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { NameNumberOverlay } from "@/components/store/JerseyOverlay";
import { NAME_CURVES, resolveCustomizer, sanitizeNameInput, sanitizeNumberInput, type ResolvedCustomizer } from "@/lib/customizer";
import { JERSEY_FONT_IDS, JERSEY_FONTS, jerseyFontFamily, type JerseyFont } from "@/lib/jersey-fonts";
import type { CustomizerConfig, NameCurve, OverlayBox } from "@/types";

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
 * Fine-tune how the name and number print on this jersey — position, size, font, curve
 * and colour — with a live preview on the back photo. Positions are % of the photo, so
 * they work at any size. Badges aren't placed here: the owner positions them by hand.
 */
export function CustomizerPositionEditor({
  value,
  onChange,
  imageBack,
}: {
  value: CustomizerConfig;
  onChange: (c: ResolvedCustomizer) => void;
  imageBack: string | null;
}) {
  const cfg = resolveCustomizer(value);
  const [name, setName] = useState("OKOCHA");
  const [number, setNumber] = useState("10");
  const groups = [...new Set(JERSEY_FONT_IDS.map((f) => JERSEY_FONTS[f].group))];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:sticky md:top-4 md:self-start">
        <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg bg-surface-strong">
          {imageBack ? (
            <Image src={imageBack} alt="" fill sizes="384px" className="object-cover" unoptimized />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
              Upload the back photo to see the preview.
            </p>
          )}
          <NameNumberOverlay config={cfg} name={name} number={number} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Sample name" value={name} onChange={(e) => setName(sanitizeNameInput(e.target.value))} hint="Try a long one too" />
          <Input label="Sample number" inputMode="numeric" value={number} onChange={(e) => setNumber(sanitizeNumberInput(e.target.value))} />
        </div>

        <label className="block text-sm font-medium">
          Font
          <select
            value={cfg.font}
            onChange={(e) => onChange({ ...cfg, font: e.target.value as JerseyFont })}
            className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 text-base"
          >
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {JERSEY_FONT_IDS.filter((f) => JERSEY_FONTS[f].group === g).map((f) => (
                  <option key={f} value={f}>
                    {JERSEY_FONTS[f].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <p className="rounded-lg bg-ink px-3 py-2 text-center text-3xl leading-tight text-white" style={{ fontFamily: jerseyFontFamily(cfg.font) }}>
          {name || "OKOCHA"} {number || "10"}
        </p>

        <fieldset className="text-sm">
          <legend className="mb-1 font-medium">Name shape</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(NAME_CURVES) as NameCurve[]).map((c) => (
              <label
                key={c}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center",
                  cfg.curve === c ? "border-ink bg-ink text-white" : "border-line bg-white",
                )}
              >
                <input type="radio" name="curve" className="sr-only" checked={cfg.curve === c} onChange={() => onChange({ ...cfg, curve: c })} />
                {NAME_CURVES[c].label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-medium">
          Print colour
          <input
            type="color"
            value={cfg.textColor}
            onChange={(e) => onChange({ ...cfg, textColor: e.target.value.toUpperCase() })}
            className="mt-1 block h-11 w-20 cursor-pointer rounded-lg border border-line"
          />
        </label>

        <BoxSliders title="Name position" box={cfg.name} withSize onChange={(b) => onChange({ ...cfg, name: { ...cfg.name, ...b } })} />
        <BoxSliders title="Number position" box={cfg.number} withSize onChange={(b) => onChange({ ...cfg, number: { ...cfg.number, ...b } })} />
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink"
          onClick={() => onChange(resolveCustomizer({ textColor: cfg.textColor, font: cfg.font, curve: cfg.curve }))}
        >
          <RotateCcw className="size-4" />
          Reset name & number positions
        </button>
      </div>
    </div>
  );
}
