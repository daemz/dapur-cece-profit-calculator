import React, { useEffect, useMemo, useState } from "react";
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
import { Plus, Trash2, Pencil, Package, Users, Search, X } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

const ALL = "__all__";

function emptyRow() {
  return {
    _key: Math.random().toString(36).slice(2),
    id: null,
    menu: "",
    jumlah: "",
    harga_mitra: "",
    harga_jual: "",
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [mitras, setMitras] = useState([]);
  const [cabangs, setCabangs] = useState([]);
  const [filterCabang, setFilterCabang] = useState(ALL);
  const [searchText, setSearchText] = useState("");
  const [open, setOpen] = useState(false);
  const [formMitraId, setFormMitraId] = useState("");
  const [formCabangId, setFormCabangId] = useState("");
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    try {
      const [p, m, c] = await Promise.all([
        api.get("/products"),
        api.get("/mitra"),
        api.get("/cabang"),
      ]);
      setProducts(p.data);
      setMitras(m.data);
      setCabangs(c.data);
    } catch {
      toast.error("Gagal memuat produk");
    }
  };

  useEffect(() => { load(); }, []);

  // Filter: cabang + search text (match menu name or mitra name)
  const filtered = useMemo(() => {
    let list = products;
    if (filterCabang !== ALL) list = list.filter((p) => p.cabang_id === filterCabang);
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.menu || "").toLowerCase().includes(q) ||
          (p.mitra_name || "").toLowerCase().includes(q) ||
          (p.cabang_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, filterCabang, searchText]);

  // Group by Mitra
  const groupedByMitra = useMemo(() => {
    const map = new Map();
    filtered.forEach((p) => {
      if (!map.has(p.mitra_id)) {
        map.set(p.mitra_id, {
          mitra_id: p.mitra_id,
          mitra_name: p.mitra_name,
          cabang_name: p.cabang_name,
          items: [],
        });
      }
      map.get(p.mitra_id).items.push(p);
    });
    return Array.from(map.values()).sort((a, b) => {
      const cn = (a.cabang_name || "").localeCompare(b.cabang_name || "");
      return cn !== 0 ? cn : (a.mitra_name || "").localeCompare(b.mitra_name || "");
    });
  }, [filtered]);

  const mitrasForForm = useMemo(() => {
    if (!formCabangId) return [];
    return mitras.filter((m) => m.cabang_id === formCabangId);
  }, [mitras, formCabangId]);

  // When form mitra changes, load its existing products into rows
  const loadRowsForMitra = (mitraId) => {
    const existing = products.filter((p) => p.mitra_id === mitraId);
    if (existing.length === 0) {
      setRows([emptyRow()]);
      return;
    }
    setRows(
      existing.map((p) => ({
        _key: p.id,
        id: p.id,
        menu: p.menu,
        jumlah: String(p.jumlah),
        harga_mitra: String(p.harga_mitra),
        harga_jual: String(p.harga_jual),
      }))
    );
  };

  const openCreate = () => {
    const cabangDefault =
      filterCabang !== ALL ? filterCabang : (cabangs[0]?.id || "");
    setFormCabangId(cabangDefault);
    setFormMitraId("");
    setRows([emptyRow()]);
    setOpen(true);
  };

  const openEdit = (mitraId, cabangId) => {
    setFormCabangId(cabangId);
    setFormMitraId(mitraId);
    loadRowsForMitra(mitraId);
    setOpen(true);
  };

  const setRowField = (key, field, val) => {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: val } : r))
    );
  };

  const removeRow = (key) => {
    setRows((prev) => prev.filter((r) => r._key !== key));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!formCabangId) return toast.error("Pilih cabang terlebih dahulu");
    if (!formMitraId) return toast.error("Pilih mitra terlebih dahulu");
    // Validate rows
    const cleaned = rows
      .map((r) => ({
        id: r.id,
        menu: (r.menu || "").trim(),
        jumlah: parseInt(r.jumlah || "0", 10),
        harga_mitra: parseFloat(r.harga_mitra || "0"),
        harga_jual: parseFloat(r.harga_jual || "0"),
      }))
      .filter((r) => r.menu.length > 0);
    if (cleaned.length === 0) return toast.error("Isi minimal 1 produk dengan menu");
    for (const r of cleaned) {
      if (r.jumlah < 0 || r.harga_mitra < 0 || r.harga_jual < 0) {
        return toast.error(`Nilai negatif tidak diperbolehkan (${r.menu})`);
      }
    }
    setSubmitting(true);
    try {
      const resp = await api.post("/products/bulk_save", {
        mitra_id: formMitraId,
        items: cleaned,
      });
      toast.success(`${resp.data.count} produk tersimpan`);
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan produk");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Produk dihapus");
      load();
    } catch {
      toast.error("Gagal menghapus produk");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-xl font-semibold tracking-tight">
              Daftar Produk (New Item)
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Stok titipan direset otomatis setiap pukul 23:59 (basis harian).
            </p>
          </div>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            onClick={openCreate}
            disabled={mitras.length === 0}
            data-testid="add-product-button"
          ><Plus size={16} className="mr-2" /> Tambah / Update</Button>
        </CardHeader>
        <CardContent>
          {/* Search + Filter row */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cari nama produk atau mitra..."
                className="pl-9 pr-9 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                data-testid="search-product-input"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  data-testid="search-product-clear"
                  aria-label="Bersihkan pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Select value={filterCabang} onValueChange={setFilterCabang}>
              <SelectTrigger className="w-full sm:w-52" data-testid="filter-cabang-products">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} data-testid="filter-cabang-all">Semua Cabang</SelectItem>
                {cabangs.map((c) => (
                  <SelectItem key={c.id} value={c.id} data-testid={`filter-cabang-${c.id}`}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mitras.length === 0 && (
            <div className="text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-md px-3 py-2 mb-4">
              Tambahkan cabang &amp; mitra terlebih dahulu sebelum menambah produk.
            </div>
          )}
          {groupedByMitra.length === 0 ? (
            <div className="text-center py-12">
              <Package size={36} className="text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-3">
                {searchText || filterCabang !== ALL
                  ? "Tidak ada produk yang cocok dengan pencarian."
                  : "Belum ada produk. Tambahkan produk pertama Anda."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByMitra.map((group) => (
                <div key={group.mitra_id} data-testid={`product-mitra-group-${group.mitra_id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-red-600" />
                      <h3 className="text-sm font-bold text-slate-800">
                        {group.mitra_name}
                      </h3>
                      <span className="text-xs text-slate-500">
                        · {group.cabang_name}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({group.items.length} produk)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                      onClick={() => openEdit(group.mitra_id, group.items[0]?.cabang_id || "")}
                      data-testid={`edit-mitra-products-${group.mitra_id}`}
                    >
                      <Pencil size={14} className="mr-1" /> Kelola Produk
                    </Button>
                  </div>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Menu</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Stok</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Harga Mitra</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Harga Jual</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Profit/Item</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((p) => (
                          <TableRow key={p.id} data-testid={`product-row-${p.id}`}>
                            <TableCell className="font-medium">{p.menu}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <span className={p.jumlah === 0 ? "text-slate-400" : "text-slate-900 font-medium"}>
                                {p.jumlah}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-slate-600 whitespace-nowrap">{formatRupiah(p.harga_mitra)}</TableCell>
                            <TableCell className="text-right text-slate-900 font-medium whitespace-nowrap">{formatRupiah(p.harga_jual)}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium whitespace-nowrap">
                              {formatRupiah(p.harga_jual - p.harga_mitra)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="inline-flex gap-1">
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => openEdit(p.mitra_id, p.cabang_id)}
                                  className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                                  data-testid={`edit-product-${p.id}`}
                                  title="Edit"
                                ><Pencil size={16} /></Button>
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => setToDelete(p)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`delete-product-${p.id}`}
                                  title="Hapus"
                                ><Trash2 size={16} /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk create/update dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Kelola Produk Mitra</DialogTitle>
            <DialogDescription>
              Pilih cabang &amp; mitra untuk menampilkan seluruh produknya. Anda dapat mengedit
              produk yang ada, menambah baris baru, atau menyimpan sekaligus.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Cabang</Label>
                <Select
                  value={formCabangId}
                  onValueChange={(v) => {
                    setFormCabangId(v);
                    setFormMitraId("");
                    setRows([emptyRow()]);
                  }}
                >
                  <SelectTrigger className="mt-1.5" data-testid="product-cabang-select">
                    <SelectValue placeholder="Pilih cabang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cabangs.map((c) => (
                      <SelectItem key={c.id} value={c.id} data-testid={`product-form-cabang-${c.id}`}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mitra</Label>
                <Select
                  value={formMitraId}
                  onValueChange={(v) => {
                    setFormMitraId(v);
                    loadRowsForMitra(v);
                  }}
                >
                  <SelectTrigger className="mt-1.5" data-testid="product-mitra-select">
                    <SelectValue placeholder={formCabangId ? "Pilih mitra..." : "Pilih cabang dulu"} />
                  </SelectTrigger>
                  <SelectContent>
                    {mitrasForForm.map((m) => (
                      <SelectItem key={m.id} value={m.id} data-testid={`select-mitra-${m.id}`}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formMitraId ? (
              <div className="space-y-2" data-testid="product-bulk-rows">
                <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  <div className="col-span-4">Menu</div>
                  <div className="col-span-2 text-right">Jumlah</div>
                  <div className="col-span-2 text-right">Harga Mitra</div>
                  <div className="col-span-3 text-right">Harga Jual</div>
                  <div className="col-span-1"></div>
                </div>
                {rows.map((r, idx) => (
                  <div
                    key={r._key}
                    className="grid grid-cols-12 gap-2 items-start bg-slate-50/60 sm:bg-transparent p-2 sm:p-0 rounded-lg"
                    data-testid={`product-bulk-row-${idx}`}
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <Input
                        placeholder="Menu (cth: Nasi Uduk)"
                        value={r.menu}
                        onChange={(e) => setRowField(r._key, "menu", e.target.value)}
                        className="focus-visible:ring-red-500/20 focus-visible:border-red-500"
                        data-testid={`bulk-menu-${idx}`}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        type="number" min="0" placeholder="Jumlah"
                        value={r.jumlah}
                        onChange={(e) => setRowField(r._key, "jumlah", e.target.value)}
                        className="text-right focus-visible:ring-red-500/20 focus-visible:border-red-500"
                        data-testid={`bulk-jumlah-${idx}`}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        type="number" min="0" step="100" placeholder="Harga Mitra"
                        value={r.harga_mitra}
                        onChange={(e) => setRowField(r._key, "harga_mitra", e.target.value)}
                        className="text-right focus-visible:ring-red-500/20 focus-visible:border-red-500"
                        data-testid={`bulk-harga-mitra-${idx}`}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-3">
                      <Input
                        type="number" min="0" step="100" placeholder="Harga Jual"
                        value={r.harga_jual}
                        onChange={(e) => setRowField(r._key, "harga_jual", e.target.value)}
                        className="text-right focus-visible:ring-red-500/20 focus-visible:border-red-500"
                        data-testid={`bulk-harga-jual-${idx}`}
                      />
                    </div>
                    <div className="col-span-1 flex items-start justify-end">
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={() => removeRow(r._key)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        data-testid={`bulk-remove-${idx}`}
                        aria-label="Hapus baris"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-slate-300 text-slate-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50"
                  onClick={addRow}
                  data-testid="bulk-add-row"
                >
                  <Plus size={14} className="mr-1.5" /> Tambah Baris
                </Button>
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic px-3 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                Pilih cabang &amp; mitra untuk mulai mengelola produk.
              </div>
            )}

            <DialogFooter>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={submitting || !formMitraId}
                data-testid="product-save-button"
              >
                {submitting ? "Menyimpan..." : "Simpan Semua"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus Produk"
        description={toDelete
          ? `Anda yakin ingin menghapus "${toDelete.menu}" dari ${toDelete.mitra_name}? Transaksi terkait juga akan dihapus.`
          : ""}
        onConfirm={async () => {
          if (toDelete) await onDelete(toDelete.id);
          setToDelete(null);
        }}
        testId="confirm-delete-product"
      />
    </div>
  );
}
