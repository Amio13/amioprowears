/** Formatting helpers. Written without Intl locale data so output is identical in Node, workerd and browsers. */

const withCommas = (n: number) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** 18450 → "₦18,450"; -1000 → "-₦1,000". Amounts are integer naira. */
export function formatNaira(amount: number): string {
  const rounded = Math.round(amount);
  return (rounded < 0 ? "-₦" : "₦") + withCommas(Math.abs(rounded));
}

/**
 * Normalise a Nigerian mobile number to 234XXXXXXXXXX (13 digits).
 * Accepts 0803 123 4567, 08031234567, +234 803 123 4567, 2348031234567, 8031234567.
 * Returns null if it isn't a valid Nigerian mobile number.
 */
export function normalizeNigerianPhone(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\+?[\d\s\-().]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");

  let local: string; // 10 digits, no leading 0
  if (digits.length === 13 && digits.startsWith("234")) local = digits.slice(3);
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);
  else if (digits.length === 10) local = digits;
  else return null;

  // Nigerian mobile prefixes start 70x, 80x, 81x, 90x, 91x.
  if (!/^(70|80|81|90|91)\d{8}$/.test(local)) return null;
  return "234" + local;
}

/** "2348031234567" → "0803 123 4567" for display. Returns input unchanged if not normalised. */
export function formatPhoneForDisplay(phone: string): string {
  const m = /^234(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : phone;
}

/** Free click-to-chat link. `number` is 234XXXXXXXXXX (no plus, no leading zero). */
export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Dates, always shown in Nigerian time (WAT = UTC+1, no daylight saving)
// ---------------------------------------------------------------------------

export const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-26T13:05:00Z" → "26 Sep 2026" (Lagos date). */
export function formatDate(iso: string): string {
  const d = new Date(Date.parse(iso) + LAGOS_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "2026-09-26T13:05:00Z" → "26 Sep 2026, 14:05" (Lagos time). */
export function formatDateTime(iso: string): string {
  const d = new Date(Date.parse(iso) + LAGOS_OFFSET_MS);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(iso)}, ${hh}:${mm}`;
}

/** A "YYYY-MM-DD" day in Lagos → the UTC instant it starts (00:00 WAT). */
export function lagosDayStart(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - LAGOS_OFFSET_MS);
}

/** The Lagos calendar day of an instant, as "YYYY-MM-DD". */
export function lagosDay(at: Date): string {
  return new Date(at.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}
