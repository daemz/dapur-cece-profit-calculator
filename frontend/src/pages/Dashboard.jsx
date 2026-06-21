import React, { useEffect, useMemo, useState } from "react";
import { api, formatRupiah } from "@/lib/api";
import { exportDashboardPDF, exportMitraPDF } from "@/lib/pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, Wallet, Package, Store, Download, Printer, FileText, Building2,
} from "lucide-react";
import { toast } from "sonner";
import Receipt from "@/components/Receipt";

const ALL = "__all__";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cabangs, setCabangs] = useState([]);
  const [selectedCabang, setSelectedCabang] = useState(ALL);
  const [period, setPeriod] = useState("daily");
  const [chart, setChart] = useState(null);
  const [printData, setPrintData] = useState(null);

  const loadCabangs = async () => {
    try {
      const r = await api.get("/cabang");
      setCabangs(r.data);
    } catch (_e) {
      // ignore
    }
  };

  const loadDashboard = async (cabangFilter) => {
    try {
      const q = cabangFilter && cabangFilter !== ALL ? `?cabang_id=${cabangFilter}` : "";
      const r = await api.get(`/dashboard/today${q}`);
      setData(r.data);
    } catch (_e) {
      toast.error("Gagal memuat dashboard");
    }
  };

  const loadChart = async (p, cabangFilter) => {
    try {
      const cq = cabangFilter && cabangFilter !== ALL ? `&cabang_id=${cabangFilter}` : "";
      const r = await api.get(`/dashboard/chart?period=${p}${cq}`);
      setChart(r.data);
    } catch (_e) {
      toast.error("Gagal memuat grafik");
    }
  };

  useEffect(() => { loadCabangs(); }, []);
  useEffect(() => { loadDashboard(selectedCabang); }, [selectedCabang]);
  useEffect(() => { loadChart(period, selectedCabang); }, [period, selectedCabang]);

  // Group mitra cards by cabang for visual grouping
  const groupedCards = useMemo(() => {
    if (!data?.mitra_cards) return [];
    const map = new Map();
    data.mitra_cards.forEach((m) => {
      if (!map.has(m.cabang_id)) map.set(m.cabang_id, { cabang_name: m.cabang_name, items: [] });
      map.get(m.cabang_id).items.push(m);
    });
    return Array.from(map.entries()).map(([cabang_id, v]) => ({ cabang_id, ...v }));
  }, [data]);

  const printAll = () => {
    if (!data) return;
    const items = data.mitra_cards.flatMap((m) =>
      m.items.map((it) => ({ ...it, mitra_name: m.mitra_name }))
    );
    setPrintData({
      title: "STRUK PENJUALAN", date: data.date, items,
      total: data.metrics.total_sales, profit: data.metrics.total_profit,
    });
    setTimeout(() => { window.print(); setPrintData(null); }, 200);
  };

  const metrics = data?.metrics || { total_sales: 0, total_profit: 0, total_items: 0, mitra_count: 0 };

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Cabang selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-red-600" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
            Cabang
          </span>
          <Select value={selectedCabang} onValueChange={setSelectedCabang}>
            <SelectTrigger className="w-60" data-testid="dashboard-cabang-select">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL} data-testid="dashboard-cabang-all">Semua Cabang</SelectItem>
              {cabangs.map((c) => (
                <SelectItem key={c.id} value={c.id} data-testid={`dashboard-cabang-${c.id}`}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard icon={Wallet} label="Pendapatan Hari Ini" value={formatRupiah(metrics.total_sales)} testId="metric-sales" accent />
        <MetricCard icon={TrendingUp} label="Profit Hari Ini" value={formatRupiah(metrics.total_profit)} testId="metric-profit" />
        <MetricCard icon={Package} label="Item Terjual" value={metrics.total_items} testId="metric-items" />
        <MetricCard icon={Store} label="Mitra Terdaftar" value={metrics.mitra_count} testId="metric-mitra" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          Kartu Mitra Hari Ini
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportDashboardPDF(data)}
            className="border-slate-300" data-testid="export-pdf-button">
            <Download size={16} className="mr-2" /> Export PDF
          </Button>
          <Button onClick={printAll} className="bg-red-600 hover:bg-red-700 text-white" data-testid="print-receipt-button">
            <Printer size={16} className="mr-2" /> Cetak Struk
          </Button>
        </div>
      </div>

      {groupedCards.length ? (
        <div className="space-y-8">
          {groupedCards.map((group) => (
            <div key={group.cabang_id} data-testid={`dashboard-group-${group.cabang_id}`}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-red-600" />
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
                  {group.cabang_name}
                </h3>
                <span className="text-xs text-slate-400">({group.items.length} mitra)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {group.items.map((m) => (
                  <MitraCard key={m.mitra_id} data={m} date={data.date} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      <Card className="border-slate-200" data-testid="sales-chart-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="font-heading text-xl font-semibold tracking-tight">
            Grafik Penjualan
          </CardTitle>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="daily" data-testid="chart-period-daily">Harian</TabsTrigger>
              <TabsTrigger value="weekly" data-testid="chart-period-weekly">Mingguan</TabsTrigger>
              <TabsTrigger value="monthly" data-testid="chart-period-monthly">Bulanan</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {period === "daily" ? (
                <BarChart data={chart?.series || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Legend />
                  <Bar dataKey="sales" name="Pendapatan" fill="#dc2626" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chart?.series || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" name="Pendapatan" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
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

function MetricCard({ icon: Icon, label, value, testId, accent }) {
  return (
    <Card className={`border-slate-200 ${accent ? "bg-red-600 border-red-600 text-white" : "bg-white"}`} data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className={`text-xs font-bold uppercase tracking-[0.18em] ${accent ? "text-red-100" : "text-slate-500"}`}>
              {label}
            </div>
            <div className={`font-heading text-2xl md:text-3xl font-bold mt-3 ${accent ? "text-white" : "text-slate-900"}`}>
              {value}
            </div>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? "bg-white/15" : "bg-red-50"}`}>
            <Icon size={20} className={accent ? "text-white" : "text-red-600"} strokeWidth={2.2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MitraCard({ data, date }) {
  return (
    <Card className="border-slate-200 hover:shadow-sm transition-shadow flex flex-col" data-testid={`mitra-card-${data.mitra_id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg font-semibold tracking-tight text-slate-900">
            {data.mitra_name}
          </CardTitle>
          <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-700 rounded-full">
            {data.total_items} terjual
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3">
        {data.items.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Belum ada penjualan hari ini.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((it, idx) => (
              <li key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{it.menu}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {it.jumlah_terjual} × {formatRupiah(it.harga_mitra)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{formatRupiah(it.setoran_mitra)}</div>
                  <div className="text-xs text-emerald-600 mt-0.5">+{formatRupiah(it.profit)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="pt-3 mt-auto border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Setoran Mitra</span>
            <span className="font-heading text-base font-bold text-slate-900">{formatRupiah(data.total_setoran)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pendapatan warung</span>
            <span>{formatRupiah(data.total_sales)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-600">
            <span>Profit warung</span>
            <span className="font-medium">{formatRupiah(data.total_profit)}</span>
          </div>
        </div>
        <Button
          variant="outline" size="sm"
          className="w-full mt-2 border-slate-300 text-slate-700 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
          onClick={() => exportMitraPDF(data, date)}
          disabled={data.items.length === 0}
          data-testid={`export-mitra-pdf-${data.mitra_id}`}
        ><FileText size={14} className="mr-2" /> Export PDF Mitra</Button>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed border-2 border-slate-200 bg-white" data-testid="empty-mitra">
      <CardContent className="p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <Store size={26} className="text-red-600" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-slate-900 mt-4">
          Belum ada mitra terdaftar
        </h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Tambahkan <strong>Cabang</strong> dulu, lalu Mitra, Produk, dan transaksi.
        </p>
      </CardContent>
    </Card>
  );
}
