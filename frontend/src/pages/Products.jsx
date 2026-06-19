import React, { useEffect, useState } from "react";
import { api, formatRupiah } from "@/lib/api";
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
import { Plus, Trash2, Pencil, Package } from "lucide-react";
import { toast } from "sonner";

const initialForm = {
  mitra_id: "",
  menu: "",
  jumlah: "",
  harga_mitra: "",
  harga_jual: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [mitras, setMitras] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    try {
      const [p, m] = await Promise.all([api.get("/products"), api.get("/mitra")]);
      setProducts(p.data);
      setMitras(m.data);
    } catch {
      toast.error("Gagal memuat produk");
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      mitra_id: p.mitra_id,
      menu: p.menu,
      jumlah: String(p.jumlah),
      harga_mitra: String(p.harga_mitra),
      harga_jual: String(p.harga_jual),
    });
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.mitra_id) return toast.error("Pilih mitra terlebih dahulu");
    const payload = {
      mitra_id: form.mitra_id,
      menu: form.menu,
      jumlah: parseInt(form.jumlah || "0", 10),
      harga_mitra: parseFloat(form.harga_mitra || "0"),
      harga_jual: parseFloat(form.harga_jual || "0"),
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Produk diperbarui");
      } else {
        await api.post("/products", payload);
        toast.success("Produk ditambahkan");
      }
      setOpen(false);
      setEditing(null);
      setForm(initialForm);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan produk");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Hapus produk ini? Transaksi terkait juga akan dihapus.")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Produk dihapus");
      load();
    } catch {
      toast.error("Gagal menghapus produk");
    }
  };

  const profit = (form.harga_jual && form.harga_mitra)
    ? (parseFloat(form.harga_jual) - parseFloat(form.harga_mitra))
    : 0;

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight">
            Daftar Produk (New Item)
          </CardTitle>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={openCreate}
            disabled={mitras.length === 0}
            data-testid="add-product-button"
          >
            <Plus size={16} className="mr-2" /> New Item
          </Button>
        </CardHeader>
        <CardContent>
          {mitras.length === 0 && (
            <div className="text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-md px-3 py-2 mb-4">
              Tambahkan mitra terlebih dahulu di menu <strong>Mitra</strong>.
            </div>
          )}
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package size={36} className="text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Belum ada produk. Tambahkan produk pertama Anda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitra</TableHead>
                  <TableHead>Menu</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Harga Mitra</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Profit/Item</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} data-testid={`product-row-${p.id}`}>
                    <TableCell className="font-medium">{p.mitra_name}</TableCell>
                    <TableCell>{p.menu}</TableCell>
                    <TableCell className="text-right">{p.jumlah}</TableCell>
                    <TableCell className="text-right text-slate-600">{formatRupiah(p.harga_mitra)}</TableCell>
                    <TableCell className="text-right text-slate-900 font-medium">{formatRupiah(p.harga_jual)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {formatRupiah(p.harga_jual - p.harga_mitra)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(p)}
                          className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                          data-testid={`edit-product-${p.id}`}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(p.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-product-${p.id}`}
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? "Edit Produk" : "Tambah Produk Sarapan"}
            </DialogTitle>
            <DialogDescription>
              Isi detail produk: mitra, menu, jumlah titipan, harga dari mitra, dan harga jual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Mitra</Label>
              <Select
                value={form.mitra_id}
                onValueChange={(v) => setForm({ ...form, mitra_id: v })}
              >
                <SelectTrigger className="mt-1.5" data-testid="product-mitra-select">
                  <SelectValue placeholder="Pilih mitra..." />
                </SelectTrigger>
                <SelectContent>
                  {mitras.map((m) => (
                    <SelectItem key={m.id} value={m.id} data-testid={`select-mitra-${m.id}`}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="menu">Menu Sarapan</Label>
              <Input
                id="menu"
                value={form.menu}
                onChange={(e) => setForm({ ...form, menu: e.target.value })}
                placeholder="Contoh: Nasi Uduk"
                className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="product-menu-input"
              />
            </div>
            <div>
              <Label htmlFor="jumlah">Jumlah (titipan)</Label>
              <Input
                id="jumlah"
                type="number"
                min="0"
                value={form.jumlah}
                onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                placeholder="0"
                className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="product-jumlah-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="harga_mitra">Harga Dari Mitra</Label>
                <Input
                  id="harga_mitra"
                  type="number"
                  min="0"
                  step="100"
                  value={form.harga_mitra}
                  onChange={(e) => setForm({ ...form, harga_mitra: e.target.value })}
                  placeholder="0"
                  className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                  required
                  data-testid="product-harga-mitra-input"
                />
              </div>
              <div>
                <Label htmlFor="harga_jual">Harga Jual</Label>
                <Input
                  id="harga_jual"
                  type="number"
                  min="0"
                  step="100"
                  value={form.harga_jual}
                  onChange={(e) => setForm({ ...form, harga_jual: e.target.value })}
                  placeholder="0"
                  className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                  required
                  data-testid="product-harga-jual-input"
                />
              </div>
            </div>
            {profit > 0 && (
              <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-3 py-2">
                Profit per item: <strong>{formatRupiah(profit)}</strong>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="product-save-button">
                {editing ? "Simpan Perubahan" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
