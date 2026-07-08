import { formatRupiah } from "@/lib/api";

/**
 * Normalizes an Indonesian phone number to WhatsApp international format.
 * "08123456789" -> "628123456789"
 * "+62 812 3456 789" -> "628123456789"
 * Returns null if invalid.
 */
export function normalizeWaNumber(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (!digits.startsWith("62")) {
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

/**
 * Build the report message body for a mitra.
 * `mitraCard` shape (from /api/dashboard/today mitra_cards[i]):
 *   { mitra_name, items:[{jumlah_terjual, stok, ...}], total_setoran, total_items }
 */
export function buildMitraReportMessage(mitraCard) {
  const name = mitraCard?.mitra_name || "Mitra";
  const totalTerjual = mitraCard?.total_items ?? 0;
  const totalTidakTerjual = (mitraCard?.items || []).reduce((a, it) => {
    const stok = it.stok ?? 0;
    const sold = it.jumlah_terjual ?? 0;
    return a + Math.max(stok - sold, 0);
  }, 0);
  const totalDibayar = mitraCard?.total_setoran ?? 0;

  return [
    `Halo kak ${name}, berikut rincian hasil penjualan hari ini ya!`,
    "",
    `Total Produk Terjual: ${totalTerjual}`,
    `Total Produk Tidak Terjual: ${totalTidakTerjual}`,
    `Total Dibayar ke Mitra: ${formatRupiah(totalDibayar)}`,
  ].join("");
}
