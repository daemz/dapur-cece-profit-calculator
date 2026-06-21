import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
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
import { Plus, Trash2, Pencil, Store, Building2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

const ALL = "__all__";

export default function MitraPage() {
  const [mitras, setMitras] = useState([]);
  const [cabangs, setCabangs] = useState([]);
  const [filterCabang, setFilterCabang] = useState(ALL);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", cabang_id: "" });
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    try {
      const [m, c] = await Promise.all([api.get("/mitra"), api.get("/cabang")]);
      setMitras(m.data);
      setCabangs(c.data);
    } catch {
      toast.error("Gagal memuat data");
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filterCabang === ALL) return mitras;
    return mitras.filter((m) => m.cabang_id === filterCabang);
  }, [mitras, filterCabang]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((m) => {
      if (!map.has(m.cabang_id)) map.set(m.cabang_id, { cabang_name: m.cabang_name, items: [] });
      map.get(m.cabang_id).items.push(m);
    });
    return Array.from(map.entries()).map(([cabang_id, v]) => ({ cabang_id, ...v }));
  }, [filtered]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      cabang_id: filterCabang !== ALL ? filterCabang : (cabangs[0]?.id || ""),
    });
    setOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({ name: m.name, cabang_id: m.cabang_id });
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = form.name.trim();
    if (!trimmed) return;
    if (!form.cabang_id) return toast.error("Pilih cabang terlebih dahulu");
    try {
      const payload = { name: trimmed, cabang_id: form.cabang_id };
      if (editing) {
        await api.put(`/mitra/${editing.id}`, payload);
        toast.success("Mitra diperbarui");
      } else {
        await api.post("/mitra", payload);
        toast.success("Mitra ditambahkan");
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan mitra");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/mitra/${id}`);
      toast.success("Mitra dihapus");
      load();
    } catch {
      toast.error("Gagal menghapus mitra");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight">
            Daftar Mitra
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterCabang} onValueChange={setFilterCabang}>
              <SelectTrigger className="w-52" data-testid="filter-cabang-mitra">
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
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={openCreate}
              disabled={cabangs.length === 0}
              data-testid="add-mitra-button"
            >
              <Plus size={16} className="mr-2" /> Tambah Mitra
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cabangs.length === 0 && (
            <div className="text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-md px-3 py-2 mb-4">
              Tambahkan cabang terlebih dahulu di menu <strong>Cabang</strong>.
            </div>
          )}
          {grouped.length === 0 ? (
            <div className="text-center py-12">
              <Store size={36} className="text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Belum ada mitra pada filter ini.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.cabang_id} data-testid={`mitra-group-${group.cabang_id}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={14} className="text-red-600" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
                      {group.cabang_name}
                    </h3>
                    <span className="text-xs text-slate-400">({group.items.length} mitra)</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Mitra</TableHead>
                        <TableHead>Tanggal Daftar</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((m) => (
                        <TableRow key={m.id} data-testid={`mitra-row-${m.id}`}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {new Date(m.created_at).toLocaleDateString("id-ID")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost" size="sm" onClick={() => openEdit(m)}
                                className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                                data-testid={`edit-mitra-${m.id}`}
                                title="Edit"
                              ><Pencil size={16} /></Button>
                              <Button
                                variant="ghost" size="sm" onClick={() => setToDelete(m)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`delete-mitra-${m.id}`}
                                title="Hapus"
                              ><Trash2 size={16} /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? "Edit Mitra" : "Tambah Mitra Baru"}
            </DialogTitle>
            <DialogDescription>
              Pilih cabang dan masukkan nama mitra.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Cabang</Label>
              <Select
                value={form.cabang_id}
                onValueChange={(v) => setForm({ ...form, cabang_id: v })}
              >
                <SelectTrigger className="mt-1.5" data-testid="mitra-cabang-select">
                  <SelectValue placeholder="Pilih cabang..." />
                </SelectTrigger>
                <SelectContent>
                  {cabangs.map((c) => (
                    <SelectItem key={c.id} value={c.id} data-testid={`select-cabang-${c.id}`}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mitra-name">Nama Mitra</Label>
              <Input
                id="mitra-name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Bu Siti"
                className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="mitra-name-input"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="mitra-save-button">
                {editing ? "Simpan Perubahan" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus Mitra"
        description={toDelete
          ? `Anda yakin ingin menghapus mitra "${toDelete.name}"? Semua produk & transaksi terkait juga akan dihapus.`
          : ""}
        onConfirm={async () => {
          if (toDelete) await onDelete(toDelete.id);
          setToDelete(null);
        }}
        testId="confirm-delete-mitra"
      />
    </div>
  );
}
