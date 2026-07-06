import React, { useEffect, useMemo, useState } from "react";
import { api, formatRupiah, todayStr, formatDateID } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Printer, Eye, Receipt as ReceiptIcon, Package } from "lucide-react";
import { toast } from "sonner";
import Receipt from "@/components/Receipt";
import ConfirmDialog from "@/components/ConfirmDialog";

const ALL = "__all__";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [mitras, setMitras] = useState([]);
  const [cabangs, setCabangs] = useState([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [filterCabang, setFilterCabang] = useState(ALL);
  const [form, setForm] = useState({ cabang_id: "", mitra_id: "", date: todayStr() });
  const [qtyMap, setQtyMap] = useState({}); // product_id -> qty string
  const [submitting, setSubmitting] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      if (filterCabang !== ALL) params.set("cabang_id", filterCabang);
      const [t, p, m, c] = await Promise.all([
        api.get(`/transactions?${params.toString()}`),
        api.get("/products"),
        api.get("/mitra"),
        api.get("/cabang"),
      ]);
      setTransactions(t.data);
      setProducts(p.data);
      setMitras(m.data);
      setCabangs(c.data);
    } catch {
      toast.error("Gagal memuat transaksi");
    }
  };

  useEffect(() => { load(); }, [filterDate, filterCabang]);

  const openCreate = () => {
    const cabangDefault = filterCabang !== ALL ? filterCabang : (cabangs[0]?.id || "");
    setForm({ cabang_id: cabangDefault, mitra_id: "", date: todayStr() });
    setQtyMap({});
    setOpen(true);
  };

  const mitrasForForm = useMemo(() => {
    if (!form.cabang_id) return [];
    return mitras.filter((m) => m.cabang_id === form.cabang_id);
  }, [mitras, form.cabang_id]);

  const productsForForm = useMemo(() => {
    if (!form.mitra_id) return [];
    return products.filter((p) => p.mitra_id === form.mitra_id);
  }, [products, form.mitra_id]);

  // Compute remaining stock per product for the selected date (today's product.jumlah - already sold on that date)
  const soldMap = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (t.date === form.date) {
        map[t.product_id] = (map[t.product_id] || 0) + t.jumlah_terjual;
      }
    });
    return map;
  }, [transactions, form.date]);

  const remainingFor = (p) => p.jumlah - (soldMap[p.id] || 0);

  const setQty = (pid, val) => {
    setQtyMap((prev) => ({ ...prev, [pid]: val }));
  };

  const totalItemsToSubmit = useMemo(() => {
    return productsForForm.reduce((a, p) => a + (parseInt(qtyMap[p.id] || "0", 10) || 0), 0);
  }, [qtyMap, productsForForm]);

  const validationError = useMemo(() => {
    for (const p of productsForForm) {
      const q = parseInt(qtyMap[p.id] || "0", 10) || 0;
      if (q < 0) return `Jumlah tidak boleh negatif untuk ${p.menu}.`;
      if (q > remainingFor(p)) {
        return `${p.menu}: jumlah ${q} melebihi sisa stok ${remainingFor(p)}.`;
      }
    }
    return null;
  }, [productsForForm, qtyMap, soldMap]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.cabang_id) return toast.error("Pilih cabang terlebih dahulu");
    if (!form.mitra_id) return toast.error("Pilih mitra terlebih dahulu");
    if (totalItemsToSubmit <= 0) return toast.error("Masukkan jumlah terjual pada minimal 1 produk");
    if (validationError) return toast.error(validationError);

    const items = productsForForm
      .map((p) => ({ product_id: p.id, jumlah_terjual: parseInt(qtyMap[p.id] || "0", 10) || 0 }))
      .filter((it) => it.jumlah_terjual > 0);

    setSubmitting(true);
    try {
      const r = await api.post("/transactions/bulk", {
        date: form.date || todayStr(),
        items,
      });
      toast.success(`${r.data.count} transaksi berhasil dicatat`);
      setOpen(false);
      setQtyMap({});
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan transaksi");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      toast.success("Transaksi dihapus");
      load();
    } catch { toast.error("Gagal menghapus transaksi"); }
  };

  const printOne = (tx) => {
    setPrintData({
      title: "STRUK PEMBELIAN", date: tx.date, mitra_name: tx.mitra_name,
      items: [{
        menu: tx.menu, jumlah_terjual: tx.jumlah_terjual,
        harga_jual: tx.harga_jual, total_pendapatan: tx.total_pendapatan,
      }],
      total: tx.total_pendapatan, profit: tx.profit,
    });
    setTimeout(() => { window.print(); setPrintData(null); }, 200);
  };

  const totalPendapatan = transactions.reduce((a, t) => a + t.total_pendapatan, 0);
  const totalProfit = transactions.reduce((a, t) => a + t.profit, 0);
  const totalItems = transactions.reduce((a, t) => a + t.jumlah_terjual, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard label="Pendapatan" value={formatRupiah(totalPendapatan)} />
        <SummaryCard label="Profit" value={formatRupiah(totalProfit)} accent />
        <SummaryCard label="Item Terjual" value={totalItems} />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight">
            Transaksi
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterCabang} onValueChange={setFilterCabang}>
              <SelectTrigger className="w-full sm:w-44" data-testid="filter-cabang-tx">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Cabang</SelectItem>
                {cabangs.map((c) => (
                  <SelectItem key={c.id} value={c.id} data-testid={`filter-cabang-tx-${c.id}`}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date" value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full sm:w-44 focus-visible:ring-red-500/20 focus-visible:border-red-500"
              data-testid="filter-date-input"
            />
            <Button
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
              disabled={mitras.length === 0}
              onClick={openCreate}
              data-testid="add-transaction-button"
            ><Plus size={16} className="mr-2" /> Input Penjualan</Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon size={36} className="text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Belum ada transaksi pada filter ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="whitespace-nowrap">Cabang</TableHead>
                    <TableHead className="whitespace-nowrap">Mitra</TableHead>
                    <TableHead className="whitespace-nowrap">Menu</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Qty</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Pendapatan</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Profit</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id} data-testid={`tx-row-${t.id}`}>
                      <TableCell className="text-slate-600 text-sm whitespace-nowrap">{t.date}</TableCell>
                      <TableCell className="text-slate-600 text-sm whitespace-nowrap">{t.cabang_name}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{t.mitra_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{t.menu}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{t.jumlah_terjual}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">{formatRupiah(t.total_pendapatan)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium whitespace-nowrap">{formatRupiah(t.profit)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDetail(t)}
                            className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                            data-testid={`detail-tx-${t.id}`} title="Detail">
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => printOne(t)}
                            className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                            data-testid={`print-tx-${t.id}`} title="Cetak Struk">
                            <Printer size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setToDelete(t)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-tx-${t.id}`} title="Hapus">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Penjualan (Bulk by Mitra) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Input Penjualan</DialogTitle>
            <DialogDescription>
              Pilih Cabang &amp; Mitra, lalu isi jumlah terjual untuk tiap produk.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Cabang</Label>
                <Select
                  value={form.cabang_id}
                  onValueChange={(v) => { setForm({ ...form, cabang_id: v, mitra_id: "" }); setQtyMap({}); }}
                >
                  <SelectTrigger className="mt-1.5" data-testid="tx-cabang-select">
                    <SelectValue placeholder="Pilih cabang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cabangs.map((c) => (
                      <SelectItem key={c.id} value={c.id} data-testid={`tx-form-cabang-${c.id}`}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mitra</Label>
                <Select
                  value={form.mitra_id}
                  onValueChange={(v) => { setForm({ ...form, mitra_id: v }); setQtyMap({}); }}
                >
                  <SelectTrigger className="mt-1.5" data-testid="tx-mitra-select">
                    <SelectValue placeholder={form.cabang_id ? "Pilih mitra..." : "Pilih cabang dulu"} />
                  </SelectTrigger>
                  <SelectContent>
                    {mitrasForForm.map((m) => (
                      <SelectItem key={m.id} value={m.id} data-testid={`tx-form-mitra-${m.id}`}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tx-date">Tanggal</Label>
              <Input
                id="tx-date" type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="tx-date-input"
              />
            </div>

            {/* Products list */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Produk Mitra
              </Label>
              <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                {!form.mitra_id ? (
                  <div className="p-6 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                    <Package size={28} className="text-slate-300" />
                    Pilih Cabang &amp; Mitra untuk menampilkan produknya.
                  </div>
                ) : productsForForm.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    Mitra ini belum punya produk.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100" data-testid="tx-bulk-product-list">
                    {productsForForm.map((p) => {
                      const remaining = remainingFor(p);
                      const q = parseInt(qtyMap[p.id] || "0", 10) || 0;
                      const invalid = q > remaining;
                      return (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-3 p-3 sm:p-4"
                          data-testid={`tx-bulk-row-${p.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-800 truncate">{p.menu}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Stok: <strong>{p.jumlah}</strong>
                              <span className="mx-1.5">•</span>
                              Sisa:{" "}
                              <span className={remaining <= 0 ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                                {remaining}
                              </span>
                              <span className="mx-1.5 hidden sm:inline">•</span>
                              <span className="hidden sm:inline text-slate-500">{formatRupiah(p.harga_jual)}</span>
                            </div>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            inputMode="numeric"
                            placeholder="0"
                            value={qtyMap[p.id] ?? ""}
                            onChange={(e) => setQty(p.id, e.target.value)}
                            disabled={remaining <= 0}
                            className={`w-20 sm:w-24 text-right focus-visible:ring-red-500/20 focus-visible:border-red-500 ${
                              invalid ? "border-red-500 focus-visible:ring-red-500/40" : ""
                            }`}
                            data-testid={`tx-bulk-qty-${p.id}`}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {validationError && (
                <p className="text-xs text-red-600 mt-1.5" data-testid="tx-bulk-error">{validationError}</p>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="text-xs text-slate-500 sm:mr-auto">
                Total item: <strong className="text-slate-800">{totalItemsToSubmit}</strong>
              </div>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={submitting || totalItemsToSubmit <= 0 || !!validationError}
                data-testid="tx-save-button"
              >
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto" data-testid="tx-detail-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">Detail Transaksi</DialogTitle>
            <DialogDescription>Ringkasan penjualan yang tercatat.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-1 divide-y divide-slate-100">
              <DetailRow label="Tanggal" value={detail.date} />
              <DetailRow label="Cabang" value={detail.cabang_name} />
              <DetailRow label="Mitra" value={detail.mitra_name} />
              <DetailRow label="Menu" value={detail.menu} />
              <DetailRow label="Jumlah Terjual" value={`${detail.jumlah_terjual} pcs`} />
              <DetailRow label="Harga Mitra" value={formatRupiah(detail.harga_mitra)} />
              <DetailRow label="Harga Jual" value={formatRupiah(detail.harga_jual)} />
              <DetailRow label="Profit per Item" value={formatRupiah(detail.harga_jual - detail.harga_mitra)} />
              <DetailRow label="Setoran Mitra" value={formatRupiah(detail.harga_mitra * detail.jumlah_terjual)} />
              <DetailRow label="Total Pendapatan" value={formatRupiah(detail.total_pendapatan)} strong />
              <DetailRow label="Total Profit" value={formatRupiah(detail.profit)} highlight />
              <DetailRow label="Dicatat pada" value={formatDateID(detail.created_at)} muted />
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => detail && printOne(detail)} data-testid="detail-print-button">
              <Printer size={16} className="mr-2" /> Cetak Struk
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => setDetail(null)} data-testid="detail-close-button">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printData && (
        <div id="print-area">
          <Receipt {...printData} />
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus Transaksi"
        description={toDelete
          ? `Hapus transaksi ${toDelete.menu} (${toDelete.mitra_name}) tanggal ${toDelete.date}?`
          : ""}
        onConfirm={async () => {
          if (toDelete) await onDelete(toDelete.id);
          setToDelete(null);
        }}
        testId="confirm-delete-tx"
      />
    </div>
  );
}

function DetailRow({ label, value, strong, highlight, muted }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={[
          "font-medium text-right",
          strong ? "text-slate-900 text-base" : "",
          highlight ? "text-emerald-600 font-semibold" : "text-slate-800",
          muted ? "text-slate-500 font-normal text-xs" : "",
        ].join(" ")}
      >{value}</span>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <Card className={`border-slate-200 ${accent ? "bg-red-600 border-red-600" : ""}`}>
      <CardContent className="p-4 sm:p-5">
        <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] ${accent ? "text-red-100" : "text-slate-500"}`}>
          {label}
        </div>
        <div className={`font-heading text-xl sm:text-2xl font-bold mt-2 ${accent ? "text-white" : "text-slate-900"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}