import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah } from "@/lib/api";
import { toast } from "sonner";

/**
 * Save + open PDF in a way compatible with iframe/sandbox environments.
 * Returns the Blob and blob URL so the caller can also share it (e.g., WhatsApp).
 */
function openPdfBlob(doc, filename, { silent = false } = {}) {
  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }, 50);

    try {
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win && !silent) {
        toast.info("Tab baru diblokir. Aktifkan pop-up untuk membuka PDF.");
      }
    } catch (_e) {
      // ignore
    }

    if (!silent) toast.success("PDF berhasil dibuat");
    return { blob, url, filename };
  } catch (e) {
    console.error(e);
    if (!silent) toast.error("Gagal membuat PDF: " + (e?.message || "unknown"));
    return null;
  }
}

export function exportDashboardPDF(data) {
  if (!data) return;
  const doc = new jsPDF();

  // Left-aligned header block
  doc.setFontSize(16);
  doc.text("Laporan Penjualan Hari Ini", 14, 18);
  doc.setFontSize(10);
  doc.text(`Tanggal: ${data.date}`, 14, 26);
  doc.text(`Total Pendapatan: ${formatRupiah(data.metrics.total_sales)}`, 14, 32);
  doc.text(`Total Profit: ${formatRupiah(data.metrics.total_profit)}`, 14, 38);
  doc.text(`Total Item Terjual: ${data.metrics.total_items}`, 14, 44);

  const rows = [];
  data.mitra_cards.forEach((m) => {
    m.items.forEach((it) => {
      const notSold = Math.max((it.stok ?? 0) - (it.jumlah_terjual ?? 0), 0);

      rows.push([
        m.mitra_name,
        it.menu,
        String(it.jumlah_terjual),
        String(notSold),
        formatRupiah(it.harga_jual),
        formatRupiah(it.total_pendapatan),
        formatRupiah(it.profit),
      ]);
    });
  });

  autoTable(doc, {
    startY: 52,
    head: [["Mitra", "Menu", "Terjual", "Tidak Terjual", "Harga Jual", "Pendapatan", "Profit"]],
    body: rows.length ? rows : [["-", "-", "-", "-", "-", "-", "-"]],
    styles: { fontSize: 9, halign: "left" },
    headStyles: { fillColor: [220, 38, 38], halign: "left", textColor: [255, 255, 255] },
    bodyStyles: { halign: "left" },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "left" },
      2: { halign: "left" },
      3: { halign: "left" },
      4: { halign: "left" },
      5: { halign: "left" },
      5: { halign: "left" },
    },
  });

  return openPdfBlob(doc, `laporan-${data.date}.pdf`);
}

/**
 * Per-mitra PDF: only shows what the warung owes the mitra.
 * Includes ALL products (even unsold ones show qty=0).
 * All text is left-aligned. Does NOT include Harga Jual.
 */
export function buildMitraPDF(mitraCard, date) {
  if (!mitraCard) return null;
  const doc = new jsPDF();

  // Header (all left-aligned)
  doc.setFontSize(16);
  doc.text("Rekap Setoran Mitra", 14, 18);
  doc.setFontSize(11);
  doc.text(`Mitra: ${mitraCard.mitra_name}`, 14, 26);
  doc.setFontSize(10);
  doc.text(`Tanggal: ${date}`, 14, 32);

  const rows = mitraCard.items.map((it) => {
    const notSold = Math.max((it.stok ?? 0) - (it.jumlah_terjual ?? 0), 0);

    return [
    formatRupiah(it.harga_mitra),
    String(it.jumlah_terjual),
    String(notSold),
    formatRupiah(it.harga_mitra * it.jumlah_terjual),
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [["Produk", "Harga Produk", "Jumlah Terjual", "Jumlah Tidak Terjual", "Total"]],
    body: rows.length ? rows : [["-", "-", "-", "-", "-"]],
    styles: { fontSize: 10, halign: "left" },
    headStyles: { fillColor: [220, 38, 38], halign: "left", textColor: [255, 255, 255] },
    bodyStyles: { halign: "left" },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "left" },
      2: { halign: "left" },
      3: { halign: "left" },
      4: { halign: "left", fontStyle: "bold" },
    },
    foot: [
      [
        { content: "TOTAL DIBAYAR KE MITRA", colSpan: 3, styles: { halign: "left", fontStyle: "bold" } },
        { content: formatRupiah(mitraCard.total_setoran), styles: { halign: "left", fontStyle: "bold" } },
      ],
    ],
    footStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], halign: "left" },
  });

  const finalY = doc.lastAutoTable.finalY || 60;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Dokumen ini berisi rekap titipan dan setoran yang harus dibayarkan kepada mitra.",
    14, finalY + 12
  );
  doc.text("Terima kasih atas kerjasamanya.", 14, finalY + 18);

  const safeName = String(mitraCard.mitra_name).replace(/[^a-zA-Z0-9-_]/g, "_");
  return { doc, filename: `rekap-${safeName}-${date}.pdf` };
}

export function exportMitraPDF(mitraCard, date, opts = {}) {
  const built = buildMitraPDF(mitraCard, date);
  if (!built) return null;
  return openPdfBlob(built.doc, built.filename, opts);
}