import type { JerseyFont } from "@/lib/jersey-fonts";

/** Shared types. Money is always integer naira. Mirrors supabase/migrations/0001_schema.sql. */

export type Gender = "male" | "female" | "kids";
export type JerseyType = "player" | "fan";
export type Era = "current" | "vintage";
/** Collections the owner ticks per jersey in admin. */
export type ManualCollection = "top-clubs" | "national-teams" | "new-arrivals" | "super-eagles" | "champions-league";
/** Collections filled automatically from gender and era (lib/catalogue.ts → productCollections). */
export type AutoCollection = "female-kits" | "kids" | "vintage";
export type CollectionSlug = ManualCollection | AutoCollection;
export type BadgePosition = "left_chest" | "right_chest" | "sleeve";

/** Overlay box, all values in % of the jersey image (fontSize in % of image width). */
export interface OverlayBox {
  top: number;
  left: number;
  width: number;
  fontSize?: number;
}

/** How much the printed name arches (lib/customizer.ts → NAME_CURVES). */
export type NameCurve = "none" | "slight" | "strong";

/** Per-jersey print settings. Badges aren't drawn on the photo, so they have no position here. */
export interface CustomizerConfig {
  name?: OverlayBox;
  number?: OverlayBox;
  textColor?: string;
  font?: JerseyFont;
  curve?: NameCurve;
}

/**
 * What an order item was printed with, saved at checkout so the admin order page shows
 * exactly what the customer saw, even if the jersey's settings change later.
 */
export interface PrintSnapshot {
  font: JerseyFont;
  curve: NameCurve;
  textColor: string;
  name: Required<OverlayBox>;
  number: Required<OverlayBox>;
  /** Back photo the preview was drawn on (null if the jersey had none). */
  imageBack: string | null;
}

/** A badge as saved on an order item. */
export interface OrderBadge {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

export interface Settings {
  id: 1;
  name_number_fee: number;
  store_open: boolean;
  announcement: string | null;
  /** Homepage content (lib/homepage.ts → resolveHomepage). */
  homepage: unknown;
  /** Customer delivery fee per zone (migration 0008, lib/delivery-zones.ts). */
  delivery_fee_a: number;
  delivery_fee_b: number;
  delivery_fee_c: number;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  club: string;
  gender: Gender;
  type: JerseyType;
  era: Era;
  season: string | null;
  /** Ticked collections only; use productCollections() to include the automatic ones. */
  collections: ManualCollection[];
  sizes: string[];
  out_of_stock_sizes: string[];
  price: number;
  sale_price: number | null;
  image_front: string;
  image_back: string | null;
  gallery: string[];
  allow_name_number: boolean;
  customizer: CustomizerConfig;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  image_url: string;
  price: number;
  position: BadgePosition;
  is_active: boolean;
  created_at: string;
}

export type DeliveryZone = "A" | "B" | "C";
export type OrderStatus = "pending" | "processing" | "dispatched" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "amount_mismatch" | "refunded";

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  alt_phone: string | null;
  email: string;
  state: string;
  city: string;
  motor_park: string;
  delivery_zone: DeliveryZone;
  delivery_fee: number;
  subtotal: number;
  discount: number;
  total: number;
  voucher_id: string | null;
  voucher_code: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_provider: string;
  notes: string | null;
  newsletter_opt_in: boolean;
  logistics_name: string | null;
  logistics_phone: string | null;
  dispatch_note: string | null;
  paid_at: string | null;
  notified_at: string | null;
  /** Why the owner should look at this order (voucher ran out, amount mismatch, failed alert). */
  attention_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  size: string;
  custom_name: string | null;
  custom_number: string | null;
  /** First badge only — older orders. Use `badges` for the full list. */
  badge_id: string | null;
  /** All badge names joined with " + " (kept for emails, tracking and older orders). */
  badge_name: string | null;
  /** Every badge chosen (migration 0010). Empty on older orders. */
  badges: OrderBadge[];
  /** Print settings at checkout (migration 0010). Null on older orders. */
  print_style: PrintSnapshot | null;
  unit_price: number;
  customization_fee: number;
  badge_price: number;
  quantity: number;
  item_total: number;
}

export type PaymentRecordStatus =
  | "initialized"
  | "success"
  | "failed"
  | "abandoned"
  | "amount_mismatch"
  | "pending";

export interface Payment {
  id: string;
  order_id: string;
  provider: "paystack" | "crypto";
  reference: string;
  amount: number;
  amount_paid: number | null;
  currency: string;
  status: PaymentRecordStatus;
  provider_fee: number | null;
  crypto_currency: string | null;
  crypto_amount: number | null;
  exchange_rate: number | null;
  raw: unknown;
  created_at: string;
  confirmed_at: string | null;
}

export interface Voucher {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount: number | null;
  min_order_value: number;
  max_uses: number;
  used_count: number;
  product_ids: string[] | null;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  first_name: string | null;
  source: "footer" | "checkout";
  is_active: boolean;
  brevo_synced: boolean;
  subscribed_at: string;
}
