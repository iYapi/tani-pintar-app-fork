/**
 * Normalizes an Indonesian phone number to its "core" form: digits only,
 * with any leading 0, 62, or +62 stripped off (e.g. "081234567890",
 * "6281234567890", "+6281234567890" -> "81234567890").
 * This mirrors the cleanup already done in the register page frontend.
 */
export function normalizePhoneNumber(raw: string): string {
  let digits = raw.trim().replace(/[^0-9]/g, "");
  if (digits.startsWith("62")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

/** Converts a normalized core number back to E.164 format for sending messages. */
export function toE164(core: string): string {
  return `+62${core}`;
}
