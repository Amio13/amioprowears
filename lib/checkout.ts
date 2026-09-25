import "server-only";
import { randomBytes } from "node:crypto";
import { priceOrder, PRICING_PRODUCT_COLUMNS, type OrderQuote, type PricingBadge, type PricingData, type PricingProduct } from "./order-pricing";
import { getProvider } from "./payments";
import { createAdminClient } from "./supabase/admin";
import { createPublicClient } from "./supabase/public";
import type { CartLineInput, CheckoutInput } from "./validation";
import { normalizeVoucherCode, VOUCHER_COLUMNS, type VoucherRules } from "./vouchers";

/**
 * Server-side cart pricing and order creation. Every price comes from the DB —
 * the browser only sends IDs and choices (CLAUDE.md rule 2).
 */

/** Products, badges, allowed badge links and the name/number fee needed to price these lines. */
export async function loadPricingData(lines: CartLineInput[]): Promise<PricingData> {
  const db = createPublicClient(); // public data; RLS hides inactive rows, which then count as unavailable
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const badgeIds = [...new Set(lines.flatMap((l) => (l.badgeId ? [l.badgeId] : [])))];

  const [products, badges, links, settings] = await Promise.all([
    db.from("products").select(PRICING_PRODUCT_COLUMNS).in("id", productIds).returns<PricingProduct[]>(),
    badgeIds.length
      ? db.from("badges").select("id, name, price, is_active").in("id", badgeIds).returns<PricingBadge[]>()
      : Promise.resolve({ data: [] as PricingBadge[], error: null }),
    badgeIds.length
      ? db
          .from("product_badges")
          .select("product_id, badge_id")
          .in("product_id", productIds)
          .in("badge_id", badgeIds)
          .returns<{ product_id: string; badge_id: string }[]>()
      : Promise.resolve({ data: [] as { product_id: string; badge_id: string }[], error: null }),
    db.from("settings").select("name_number_fee").eq("id", 1).single<{ name_number_fee: number }>(),
  ]);
  for (const r of [products, badges, links, settings]) {
    if (r.error) throw new Error(`Loading prices failed: ${r.error.message}`);
  }

  return {
    products: new Map(products.data!.map((p) => [p.id, p])),
    badges: new Map(badges.data!.map((b) => [b.id, b])),
    allowedBadges: new Set(links.data!.map((l) => `${l.product_id}:${l.badge_id}`)),
    nameNumberFee: settings.data!.name_number_fee,
  };
}

/** Vouchers aren't public (RLS), so this uses the service role. */
export async function loadVoucher(code: string): Promise<VoucherRules | null> {
  const { data, error } = await createAdminClient()
    .from("vouchers")
    .select(VOUCHER_COLUMNS)
    .eq("code", normalizeVoucherCode(code))
    .maybeSingle<VoucherRules>();
  if (error) throw new Error(`Loading voucher failed: ${error.message}`);
  return data;
}

type QuoteInput = { lines: CartLineInput[]; state?: string; voucherCode?: string };

async function quoteWithVoucher({ lines, state, voucherCode }: QuoteInput) {
  const code = voucherCode ? normalizeVoucherCode(voucherCode) : undefined;
  const [data, voucher] = await Promise.all([loadPricingData(lines), code ? loadVoucher(code) : Promise.resolve(null)]);
  return { quote: priceOrder({ lines, data, state, voucherCode: code, voucher }), voucher };
}

/** Price preview for the cart and checkout pages. */
export async function quoteCart(input: QuoteInput): Promise<OrderQuote> {
  return (await quoteWithVoucher(input)).quote;
}

export async function isStoreOpen(): Promise<boolean> {
  const { data, error } = await createPublicClient()
    .from("settings")
    .select("store_open")
    .eq("id", 1)
    .single<{ store_open: boolean }>();
  if (error) throw new Error(`Loading settings failed: ${error.message}`);
  return data.store_open;
}

export type CreateCheckoutResult =
  | { ok: true; orderId: string; orderNumber: string; redirectUrl: string }
  | { ok: false; status: number; error: string; problems?: OrderQuote["problems"] };

/**
 * Re-price the cart from the DB, save the order + items (one transaction), record
 * the payment, and start it with the provider. Returns where to send the customer.
 */
export async function createCheckout(input: CheckoutInput, origin: string): Promise<CreateCheckoutResult> {
  const provider = getProvider(input.provider);
  if (!provider.isEnabled()) return { ok: false, status: 400, error: "That payment method isn't available." };
  if (!(await isStoreOpen())) {
    return { ok: false, status: 403, error: "We're not taking orders right now. Please check back soon." };
  }

  const { customer } = input;
  const { quote, voucher } = await quoteWithVoucher({
    lines: input.lines,
    state: customer.state,
    voucherCode: input.voucherCode,
  });
  if (quote.problems.length) {
    return { ok: false, status: 409, error: "Some items in your cart need attention.", problems: quote.problems };
  }
  if (quote.voucher && !quote.voucher.ok) return { ok: false, status: 409, error: quote.voucher.error };
  if (!quote.delivery) return { ok: false, status: 400, error: "Choose your state." };

  const db = createAdminClient();
  const voucherId = quote.voucher?.ok && voucher ? voucher.id : null;

  const { data: created, error: createError } = await db
    .rpc("create_order", {
      p_order: {
        customer_name: customer.name,
        phone: customer.phone,
        alt_phone: customer.altPhone ?? null,
        email: customer.email,
        state: customer.state,
        city: customer.city,
        motor_park: customer.motorPark,
        delivery_zone: quote.delivery.zone,
        delivery_fee: quote.delivery.fee,
        subtotal: quote.subtotal,
        discount: quote.discount,
        total: quote.total,
        voucher_id: voucherId,
        voucher_code: voucherId ? quote.voucher!.code : null,
        payment_provider: provider.id,
        notes: customer.notes ?? null,
        newsletter_opt_in: customer.newsletter,
      },
      p_items: quote.lines.map((l) => ({
        product_id: l.productId,
        product_name: l.productName,
        size: l.size,
        custom_name: l.customName ?? null,
        custom_number: l.customNumber ?? null,
        badge_id: l.badgeId ?? null,
        badge_name: l.badgeName ?? null,
        unit_price: l.unitPrice,
        customization_fee: l.customizationFee,
        badge_price: l.badgePrice,
        quantity: l.quantity,
        item_total: l.lineTotal,
      })),
    })
    .single<{ id: string; order_number: string }>();
  if (createError || !created) throw new Error(`Creating order failed: ${createError?.message}`);

  // Our own reference, saved before calling the provider so the webhook can always find it.
  const reference = `${created.order_number}-${randomBytes(4).toString("hex")}`;
  const { error: paymentError } = await db.from("payments").insert({
    order_id: created.id,
    provider: provider.id,
    reference,
    amount: quote.total,
  });
  if (paymentError) throw new Error(`Recording payment failed: ${paymentError.message}`);

  try {
    const { redirectUrl } = await provider.initialize({
      orderId: created.id,
      orderNumber: created.order_number,
      reference,
      amountNaira: quote.total,
      email: customer.email,
      callbackUrl: `${origin}/order-confirmation/${created.id}`,
      metadata: { order_id: created.id, order_number: created.order_number },
    });
    return { ok: true, orderId: created.id, orderNumber: created.order_number, redirectUrl };
  } catch (err) {
    console.error(`Starting payment for ${created.order_number} failed`, err);
    await db.from("payments").update({ status: "failed" }).eq("reference", reference);
    return { ok: false, status: 502, error: "We couldn't reach the payment provider. Please try again in a minute." };
  }
}
