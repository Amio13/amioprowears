"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ActionResult } from "@/lib/admin/action";
import { deleteBadge, saveBadge } from "@/lib/admin/actions/badges";
import { BADGE_POSITION_LABELS } from "@/lib/admin/labels";
import { BADGE_IMAGE } from "@/lib/image-compress";
import type { Badge, BadgePosition } from "@/types";
import { ImageUpload } from "./ImageUpload";
import { NetPriceInput } from "./NetPriceInput";
import { Checkbox, FormMessage } from "./ui";

export function BadgeForm({ badge }: { badge?: Badge }) {
  const router = useRouter();
  const [name, setName] = useState(badge?.name ?? "");
  const [image, setImage] = useState<string | null>(badge?.image_url ?? null);
  const [price, setPrice] = useState<number | null>(badge?.price ?? null);
  const [position, setPosition] = useState<BadgePosition>(badge?.position ?? "sleeve");
  const [active, setActive] = useState(badge?.is_active ?? true);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = result && !result.ok ? result.fields : undefined;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveBadge({ id: badge?.id, name, image_url: image ?? "", price: price ?? 0, position, is_active: active });
          setResult(r);
          if (r.ok && !badge) {
            setName("");
            setImage(null);
            setPrice(null);
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <ImageUpload
          label="Image"
          hint="Transparent PNG works best."
          required
          value={image}
          onChange={setImage}
          bucket="badge-images"
          folder="badges"
          options={BADGE_IMAGE}
          aspect="aspect-square"
          error={fields?.image_url && "Add the badge image."}
        />
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premier League" error={fields?.name} required />
          <Select
            label="Where it goes"
            value={position}
            onChange={(e) => setPosition(e.target.value as BadgePosition)}
            options={Object.entries(BADGE_POSITION_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <NetPriceInput label="Price" kind="addon" value={price} onChange={setPrice} error={fields?.price} />
          <Checkbox label="Show in store" checked={active} onChange={(e) => setActive(e.target.checked)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {badge ? "Save" : "Add badge"}
        </Button>
        {badge && (
          <Button
            variant="ghost"
            onClick={() => {
              if (!window.confirm(`Delete the "${badge.name}" badge?`)) return;
              startTransition(async () => {
                const r = await deleteBadge({ id: badge.id });
                setResult(r);
                if (r.ok) router.refresh();
              });
            }}
          >
            Delete
          </Button>
        )}
        <FormMessage result={result} />
      </div>
    </form>
  );
}
