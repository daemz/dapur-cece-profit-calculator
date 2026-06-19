import React from "react";
import { formatRupiah } from "@/lib/api";

export default function Receipt({ title = "STRUK PENJUALAN", date, items = [], total = 0, profit = 0, mitra_name }) {
  return (
    <div className="receipt">
      <div className="text-center">
        <div style={{ fontWeight: "bold", fontSize: 14 }}>SARAPAN UMKM</div>
        <div>Penitipan Sarapan Pagi</div>
        <div>{date}</div>
      </div>
      <div className="dash" />
      <div style={{ fontWeight: "bold", textAlign: "center" }}>{title}</div>
      {mitra_name && <div style={{ textAlign: "center" }}>Mitra: {mitra_name}</div>}
      <div className="dash" />
      {items.length === 0 ? (
        <div style={{ textAlign: "center" }}>Tidak ada item</div>
      ) : (
        items.map((it, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{it.menu}</span>
              <span></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ paddingLeft: 8 }}>
                {it.jumlah_terjual} x {formatRupiah(it.harga_jual)}
              </span>
              <span>{formatRupiah(it.total_pendapatan)}</span>
            </div>
            {it.mitra_name && (
              <div style={{ paddingLeft: 8, fontSize: 11, color: "#444" }}>
                Mitra: {it.mitra_name}
              </div>
            )}
          </div>
        ))
      )}
      <div className="dash" />
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
        <span>TOTAL</span>
        <span>{formatRupiah(total)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Profit</span>
        <span>{formatRupiah(profit)}</span>
      </div>
      <div className="dash" />
      <div style={{ textAlign: "center", marginTop: 6 }}>
        Terima kasih!<br />
        Semoga rezeki melimpah.
      </div>
    </div>
  );
}
