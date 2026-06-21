import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, Building2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function CabangPage() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    try {
      const r = await api.get("/cabang");
      setItems(r.data);
    } catch {
      toast.error("Gagal memuat cabang");
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setName(""); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setName(c.name); setOpen(true); };

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (editing) {
        await api.put(`/cabang/${editing.id}`, { name: trimmed });
        toast.success("Cabang diperbarui");
      } else {
        await api.post("/cabang", { name: trimmed });
        toast.success("Cabang ditambahkan");
      }
      setOpen(false);
      setEditing(null);
      setName("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan cabang");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/cabang/${id}`);
      toast.success("Cabang dihapus");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menghapus cabang");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight">
            Daftar Cabang
          </CardTitle>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={openCreate}
            data-testid="add-cabang-button"
          >
            <Plus size={16} className="mr-2" /> Tambah Cabang
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Building2 size={36} className="text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Belum ada cabang.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Cabang</TableHead>
                  <TableHead>Tanggal Daftar</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id} data-testid={`cabang-row-${c.id}`}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(c.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost" size="sm" onClick={() => openEdit(c)}
                          className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                          data-testid={`edit-cabang-${c.id}`}
                          title="Edit"
                        ><Pencil size={16} /></Button>
                        <Button
                          variant="ghost" size="sm" onClick={() => setToDelete(c)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-cabang-${c.id}`}
                          title="Hapus"
                        ><Trash2 size={16} /></Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? "Edit Cabang" : "Tambah Cabang Baru"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Nama cabang akan diperbarui di seluruh mitra, produk, dan transaksi terkait."
                : "Masukkan nama cabang baru (cth: Cabang Pusat, Cabang Kemang)."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cabang-name">Nama Cabang</Label>
              <Input
                id="cabang-name" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Cabang Pusat"
                className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="cabang-name-input"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="cabang-save-button">
                {editing ? "Simpan Perubahan" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus Cabang"
        description={toDelete
          ? `Hapus cabang "${toDelete.name}"? Semua mitra, produk, dan transaksi di cabang ini akan ikut terhapus.`
          : ""}
        onConfirm={async () => {
          if (toDelete) await onDelete(toDelete.id);
          setToDelete(null);
        }}
        testId="confirm-delete-cabang"
      />
    </div>
  );
}
