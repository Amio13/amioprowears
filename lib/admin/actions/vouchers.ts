"use server";

import { revalidatePath } from "next/cache";
import { adminAction, dbError, type ActionResult } from "../action";
import { voucherInputSchema, voucherUpdateSchema, type VoucherInput, type VoucherUpdateInput } from "../schemas";
import { randomVoucherCode, randomVoucherCodes } from "../voucher-code";

/** Create one voucher (custom or random code) or several random single codes with the same rules. */
export async function createVouchers(input: VoucherInput): Promise<ActionResult<{ codes: string[] }>> {
  return adminAction(voucherInputSchema, input, async ({ code, quantity, ...rules }, { supabase }) => {
    const codes = code ? [code] : quantity === 1 ? [randomVoucherCode()] : randomVoucherCodes(quantity);
    const { error } = await supabase.from("vouchers").insert(codes.map((c) => ({ code: c, ...rules })));
    if (error?.code === "23505") {
      return code
        ? { ok: false, error: "That code already exists.", fields: { code: "Choose a different code." } }
        : { ok: false, error: "A random code clashed with an existing one. Press Create again." };
    }
    if (error) throw dbError(error, "Creating the voucher");
    revalidatePath("/admin/vouchers");
    return { ok: true, message: `Created ${codes.length === 1 ? codes[0] : `${codes.length} codes`}.`, data: { codes } };
  });
}

/** Switch on/off, extend expiry, change max uses or note. The discount itself can't change once created. */
export async function updateVoucher(input: VoucherUpdateInput): Promise<ActionResult> {
  return adminAction(voucherUpdateSchema, input, async ({ id, ...fields }, { supabase }) => {
    const { data, error } = await supabase.from("vouchers").update(fields).eq("id", id).select("id").maybeSingle();
    if (error) throw dbError(error, "Saving the voucher");
    if (!data) throw new Error("Voucher not found.");
    revalidatePath("/admin/vouchers", "layout");
    return { ok: true, message: "Saved." };
  });
}
