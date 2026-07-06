/**
 * Normalizes an Indonesian phone number to WhatsApp international format.
 * "08123456789" -> "628123456789"
 * "+62 812 3456 789" -> "628123456789"
 * Returns null if the number is empty or too short to be valid.
 */
export function normalizeWaNumber(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (!digits.startsWith("62")) {
    // Assume it's already local (missing leading 0) — prefix 62
    if (digits.length < 10) return null;
    digits = "62" + digits;
  }
  if (digits.length < 10) return null;
  return digits;
}

export function waLink(phone, message) {
  const p = normalizeWaNumber(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

export function buildMitraReportMessage(mitraName) {
  return `Halo kak ${mitraName}, berikut rincian hasil penjualan hari ini ya!`;
}