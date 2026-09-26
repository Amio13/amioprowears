/** Random voucher codes like "APW-7KQ2". No 0/O or 1/I, so codes are easy to read out. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function randomVoucherCode(length = 4, prefix = "APW-"): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return prefix + out;
}

/** `count` distinct random codes. */
export function randomVoucherCodes(count: number, length = 6): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(randomVoucherCode(length));
  return [...codes];
}
