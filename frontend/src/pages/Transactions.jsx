import React, { useEffect, useState } from "react";
import { api, formatRupiah, todayStr } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Printer, Receipt as ReceiptIcon } from "lucide-react";
import { toast } from "sonner";
import Receipt from "@/components/Receipt";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [form, setForm] = useState({ product_id: "", jumlah_terjual: "", date: todayStr() });
  const [printData, setPrintData] = useState(null);

  const load = async () => {
    try {
      const [t, p] = await Promise.all([
        api.get(`/transactions${filterDate ? `?date=${filterDate}` : ""}`),
        api.get("/products"),
      ]);
      setTransactions(t.data);
      setProducts(p.data);
    } catch {
      toast.error("Gagal memuat transaksi");
    }
  };

  useEffect(() => { load(); }, [filterDate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id) return toast.error("Pilih produk terlebih dahulu");
    try {
      await api.post("/transactions", {
        product_id: form.product_id,
        jumlah_terjual: parseInt(form.jumlah_terjual || "0", 10),
        date: form.date || todayStr(),
      });
      toast.success("Transaksi ditambahkan");
      setForm({ product_id: "", jumlah_terjual: "", date: todayStr() });
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menambah transaksi");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    await api.delete(`/transactions/${id}`);
    toast.success("Transaksi dihapus");
    load();
  };

  const printOne = (tx) => {
    setPrintData({
      title: "STRUK PEMBELIAN",
      date: tx.date,
      mitra_name: tx.mitra_name,
      items: [{
        menu: tx.menu,
        jumlah_terjual: tx.jumlah_terjual,
        harga_jual: tx.harga_jual,
        total_pendapatan: tx.total_pendapatan,
      }],
      total: tx.total_pendapatan,
      profit: tx.profit,
    });
    setTimeout(() => {
      window.print();
      setPrintData(null);
    }, 200);
  };

  const totalPendapatan = transactions.reduce((a, t) => a + t.total_pendapatan, 0);
  const totalProfit = transactions.reduce((a, t) => a + t.profit, 0);
  const totalItems = transactions.reduce((a, t) => a + t.jumlah_terjual, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Pendapatan" value={formatRupiah(totalPendapatan)} />
        <SummaryCard label="Profit" value={formatRupiah(totalProfit)} accent />
        <SummaryCard label="Item Terjual" value={totalItems} />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight">
            Transaksi
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-44 focus-visible:ring-red-500/20 focus-visible:border-red-500"
              data-testid="filter-date-input"
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={products.length === 0}
                  data-testid="add-transaction-button"
                >
                  <Plus size={16} className="mr-2" /> Input Penjualan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-heading">Input Total Terjual</DialogTitle>
                  <DialogDescription>
                    Pilih produk dan masukkan jumlah yang terjual pada tanggal tertentu.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label>Produk</Label>
                    <Select
                      value={form.product_id}
                      onValueChange={(v) => setForm({ ...form, product_id: v })}
                    >
                      <SelectTrigger className="mt-1.5" data-testid="tx-product-select">
                        <SelectValue placeholder="Pilih produk..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} data-testid={`select-product-${p.id}`}>
                            {p.mitra_name} - {p.menu} ({formatRupiah(p.harga_jual)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="jumlah_terjual">Jumlah Terjual</Label>
                    <Input
                      id="jumlah_terjual"
                      type="number"
                      min="0"
                      value={form.jumlah_terjual}
                      onChange={(e) => setForm({ ...form, jumlah_terjual: e.target.value })}
                      placeholder="0"
                      className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                      required
                      data-testid="tx-jumlah-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tx-date">Tanggal</Label>
                    <Input
                      id="tx-date"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                      required
                      data-testid="tx-date-input"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="tx-save-button">
                      Simpan
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon size={36} className="text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Belum ada transaksi pada tanggal ini.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Mitra</TableHead>
                  <TableHead>Menu</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id} data-testid={`tx-row-${t.id}`}>
                    <TableCell className="text-slate-600 text-sm">{t.date}</TableCell>
                    <TableCell className="font-medium">{t.mitra_name}</TableCell>
                    <TableCell>{t.menu}</TableCell>
                    <TableCell className="text-right">{t.jumlah_terjual}</TableCell>
                    <TableCell className="text-right text-slate-600">{formatRupiah(t.harga_jual)}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupiah(t.total_pendapatan)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">{formatRupiah(t.profit)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => printOne(t)}
                        className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                        data-testid={`print-tx-${t.id}`}
                      >
                        <Printer size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(t.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-tx-${t.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {printData && (
        <div id="print-area">
          <Receipt {...printData} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <Card className={`border-slate-200 ${accent ? "bg-red-600 border-red-600" : ""}`}>
      <CardContent className="p-5">
        <div className={`text-xs font-bold uppercase tracking-[0.18em] ${accent ? "text-red-100" : "text-slate-500"}`}>
          {label}
        </div>
        <div className={`font-heading text-2xl font-bold mt-2 ${accent ? "text-white" : "text-slate-900"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
