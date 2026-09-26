"use client";

import { Save } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/admin/action";
import { updateVoucher } from "@/lib/admin/actions/vouchers";
import { lagosDay } from "@/lib/format";
import type { Voucher } from "@/types";
import { Checkbox, FormMessage } from "./ui";

export function VoucherEditForm({ voucher }: { voucher: Pick<Voucher, "id" | "is_active" | "max_uses" | "expires_at" | "note" | "used_count"> }) {
  const [active, setActive] = useState(voucher.is_active);
  const [maxUses, setMaxUses] = useState(voucher.max_uses);
  const [expires, setExpires] = useState(voucher.expires_at ? lagosDay(new Date(voucher.expires_at)) : "");
  const [note, setNote] = useState(voucher.note ?? "");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = result && !result.ok ? result.fields : undefined;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => setResult(await updateVoucher({ id: voucher.id, is_active: active, max_uses: maxUses, expires_at: expires || null, note })));
      }}
    >
      <Checkbox label="Active" hint="Untick to stop the code working straight away." checked={active} onChange={(e) => setActive(e.target.checked)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Uses allowed"
          type="number"
          min={1}
          value={String(maxUses)}
          onChange={(e) => setMaxUses(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
          hint={`Used ${voucher.used_count} time${voucher.used_count === 1 ? "" : "s"} so far.`}
          error={fields?.max_uses}
        />
        <Input label="Expires after" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} hint="Empty = never expires." error={fields?.expires_at} />
      </div>
      <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} error={fields?.note} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {!pending && <Save />}
          Save
        </Button>
        <FormMessage result={result} />
      </div>
    </form>
  );
}
