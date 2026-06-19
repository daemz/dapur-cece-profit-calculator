import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Store } from "lucide-react";
import { toast } from "sonner";

export default function MitraPage() {
  const [mitras, setMitras] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    try {
      const r = await api.get("/mitra");
      setMitras(r.data);
    } catch {
      toast.error("Gagal memuat mitra");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post("/mitra", { name: name.trim() });
      toast.success("Mitra ditambahkan");
      setName("");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menambah mitra");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Hapus mitra ini? Produk & transaksi terkait juga akan dihapus.")) return;
    await api.delete(`/mitra/${id}`);
    toast.success("Mitra dihapus");
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight">
            Daftar Mitra
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 text-white" data-testid="add-mitra-button">
                <Plus size={16} className="mr-2" /> Tambah Mitra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Tambah Mitra Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div>
                  <Label htmlFor="mitra-name">Nama Mitra</Label>
                  <Input
                    id="mitra-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Bu Siti"
                    className="mt-1.5 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                    required
                    data-testid="mitra-name-input"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700" data-testid="mitra-save-button">
                    Simpan
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {mitras.length === 0 ? (
            <div className="text-center py-12">
              <Store size={36} className="text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Belum ada mitra. Tambahkan mitra pertama Anda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tanggal Daftar</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mitras.map((m) => (
                  <TableRow key={m.id} data-testid={`mitra-row-${m.id}`}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(m.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(m.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-mitra-${m.id}`}
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
    </div>
  );
}
