"use client";

import { Save } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/admin/action";
import { saveSettings } from "@/lib/admin/actions/settings";
import { DELIVERY_ZONES, type DeliveryFees, type DeliveryZoneId } from "@/lib/delivery-zones";
import type { Settings } from "@/types";
import { NetPriceInput } from "./NetPriceInput";
import { Card, Checkbox, FormMessage, Textarea } from "./ui";

const ZONES = Object.keys(DELIVERY_ZONES) as DeliveryZoneId[];

export function SettingsForm({
  settings,
  deliveryFees,
}: {
  settings: Pick<Settings, "name_number_fee" | "store_open" | "announcement">;
  deliveryFees: DeliveryFees;
}) {
  const [fee, setFee] = useState<number | null>(settings.name_number_fee);
  const [delivery, setDelivery] = useState<Record<DeliveryZoneId, number | null>>(deliveryFees);
  const [open, setOpen] = useState(settings.store_open);
  const [announcement, setAnnouncement] = useState(settings.announcement ?? "");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = result && !result.ok ? result.fields : undefined;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () =>
          setResult(
            await saveSettings({
              name_number_fee: fee ?? 0,
              store_open: open,
              announcement,
              // An empty box sends NaN → "Enter the Zone … delivery fee", never free delivery by accident.
              delivery_fee_a: delivery.A ?? NaN,
              delivery_fee_b: delivery.B ?? NaN,
              delivery_fee_c: delivery.C ?? NaN,
            }),
          ),
        );
      }}
    >
      <Card title="Customisation fee">
        <p className="mb-3 text-sm text-muted">Charged once per jersey when a name, a number or both are printed.</p>
        <div className="max-w-md">
          <NetPriceInput label="Name + number" kind="addon" value={fee} onChange={setFee} error={fields?.name_number_fee} />
        </div>
      </Card>
      <Card title="Delivery fees">
        <p className="mb-3 text-sm text-muted">
          Charged once per order, by the customer&apos;s state. Changes apply to new orders only — orders already paid keep their fee.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {ZONES.map((zone) => {
            const key = `delivery_fee_${zone.toLowerCase()}` as const;
            return (
              <div key={zone}>
                <NetPriceInput
                  label={`Zone ${zone}`}
                  kind="addon"
                  value={delivery[zone]}
                  onChange={(v) => setDelivery((d) => ({ ...d, [zone]: v }))}
                  error={fields?.[key]}
                />
                <p className="mt-1 text-xs text-muted">{DELIVERY_ZONES[zone].states.join(", ")}</p>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Store">
        <Checkbox
          label="Taking orders"
          hint="Untick to close the store: customers can still browse, but checkout shows a message instead of payment."
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
        />
        <Textarea
          label="Announcement bar (optional)"
          className="mt-3"
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="e.g. Free name printing this weekend only!"
          hint="Shown at the top of every store page. Leave empty to hide it."
          error={fields?.announcement}
        />
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={pending}>
          {!pending && <Save />}
          Save settings
        </Button>
        <FormMessage result={result} />
      </div>
    </form>
  );
}
