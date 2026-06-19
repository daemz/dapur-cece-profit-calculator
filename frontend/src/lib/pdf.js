import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah } from "@/lib/api";
import { toast } from "sonner";

function openPdfBlob(doc, filename) {
  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    // Try standard download via a temporary anchor element
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      // Keep URL alive briefly so the new tab can render
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }, 50);

    // Also open in a new tab as a fallback for sandboxed iframes where
    // download attribute is ignored. Opening the blob URL allows the user
    // to view and save the PDF manually.
    try {
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        toast.info("Tab baru diblokir. Aktifkan pop-up untuk membuka PDF.");
      }
    } catch (_e) {
      // ignore
    }

    toast.success("PDF berhasil dibuat");
  } catch (e) {
    console.error(e);
    toast.error("Gagal membuat PDF: " + (e?.message || "unknown"));
  }
}

export function exportDashboardPDF(data) {
  if (!data) return;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Laporan Penjualan Hari Ini", 14, 16);
  doc.setFontSize(10);
  doc.text(`Tanggal: ${data.date}`, 14, 24);
  doc.text(`Total Pendapatan: ${formatRupiah(data.metrics.total_sales)}`, 14, 30);
  doc.text(`Total Profit: ${formatRupiah(data.metrics.total_profit)}`, 14, 36);
  doc.text(`Total Item Terjual: ${data.metrics.total_items}`, 14, 42);

  const rows = [];
  data.mitra_cards.forEach((m) => {
    m.items.forEach((it) => {
      rows.push([
        m.mitra_name,
        it.menu,
        it.jumlah_terjual,
        formatRupiah(it.harga_jual),
        formatRupiah(it.total_pendapatan),
        formatRupiah(it.profit),
      ]);
    });
  });

  autoTable(doc, {
    startY: 50,
    head: [["Mitra", "Menu", "Qty", "Harga Jual", "Pendapatan", "Profit"]],
    body: rows.length ? rows : [["-", "-", "-", "-", "-", "-"]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [220, 38, 38] },
  });

  openPdfBlob(doc, `laporan-${data.date}.pdf`);
}

/**
 * Per-mitra PDF: only shows what the warung owes the mitra.
 * Does NOT include Harga Jual (selling price).
 */
export function exportMitraPDF(mitraCard, date) {
  if (!mitraCard) return;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.text("Rekap Setoran Mitra", 14, 18);
  doc.setFontSize(11);
  doc.text(`Mitra: ${mitraCard.mitra_name}`, 14, 26);
  doc.setFontSize(10);
  doc.text(`Tanggal: ${date}`, 14, 32);

  // Body table — NO Harga Jual; only mitra-facing data
  const rows = mitraCard.items.map((it) => [
    it.menu,
    formatRupiah(it.harga_mitra),
    it.jumlah_terjual,
    formatRupiah(it.harga_mitra * it.jumlah_terjual),
  ]);

  autoTable(doc, {
    startY: 40,
    head: [["Produk", "Harga Produk", "Jumlah Terjual", "Total"]],
    body: rows.length ? rows : [["-", "-", "-", "-"]],
    styles: { fontSize: 10, halign: "left" },
    headStyles: { fillColor: [220, 38, 38], halign: "left" },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
    },
    foot: [
      [
        { content: "TOTAL DIBAYAR KE MITRA", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatRupiah(mitraCard.total_setoran), styles: { halign: "right", fontStyle: "bold" } },
      ],
    ],
    footStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42] },
  });

  const finalY = doc.lastAutoTable.finalY || 60;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Dokumen ini berisi rekap titipan dan setoran yang harus dibayarkan kepada mitra.",
    14,
    finalY + 14
  );
  doc.text("Terima kasih atas kerjasamanya.", 14, finalY + 20);

  const safeName = String(mitraCard.mitra_name).replace(/[^a-zA-Z0-9-_]/g, "_");
  openPdfBlob(doc, `rekap-${safeName}-${date}.pdf`);
}
