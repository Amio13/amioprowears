"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/admin/action";
import { saveSettings } from "@/lib/admin/actions/settings";
import type { Settings } from "@/types";
import { NetPriceInput } from "./NetPriceInput";
import { Card, Checkbox, FormMessage, Textarea } from "./ui";

export function SettingsForm({ settings }: { settings: Pick<Settings, "name_number_fee" | "store_open" | "announcement"> }) {
  const [fee, setFee] = useState<number | null>(settings.name_number_fee);
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
        startTransition(async () => setResult(await saveSettings({ name_number_fee: fee ?? 0, store_open: open, announcement })));
      }}
    >
      <Card title="Customisation fee">
        <p className="mb-3 text-sm text-muted">Charged once per jersey when a name, a number or both are printed.</p>
        <div className="max-w-md">
          <NetPriceInput label="Name + number" kind="addon" value={fee} onChange={setFee} error={fields?.name_number_fee} />
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
          Save settings
        </Button>
        <FormMessage result={result} />
      </div>
    </form>
  );
}
