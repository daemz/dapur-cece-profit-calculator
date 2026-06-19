# PRD: Sarapan UMKM Manager

## Problem Statement (original, verbatim)
buatkan saya aplikasi penghitung transaksi umkm penitipan sarapan pagi. fiturnya meliputi:
- input produk sarapan pagi (new item): kolom nya ada Mitra, Menu Sarapan, Jumlah, Harga Dari Mitra, Harga Jual
- input total produk yang dijual per hari itu.
- Grafik penjualan
- keuntungan penjualan (rumusnya profit per produk: Harga Jual dikurangi Harga Dari Mitra)
- di dashboard: terdapat card-card (atau box) dari tiap-tiap mitra yang terdaftar. card/box tersebut berisi Title (nama dari mitra), List Produk yang dijual hari itu beserta total masing-masing produk nya
- transaksi tiap produk.

## User Choices
- Auth: email/password sederhana (JWT + httpOnly cookies, bcrypt)
- Currency: Rupiah (id-ID locale)
- Sales chart periods: harian, mingguan, bulanan
- Theme: merah (red primary #DC2626) Swiss/high-contrast style
- Extras: Export PDF (jspdf), cetak struk (window.print)

## Architecture
- **Backend**: FastAPI (single file /app/backend/server.py), MongoDB (motor), bcrypt+pyjwt auth, all routes /api prefix
- **Frontend**: React 19 + react-router-dom 7, Shadcn UI, Tailwind, recharts, sonner, jspdf, lucide-react
- **Collections**: users, mitra, products, transactions, password_reset_tokens, login_attempts

## What's been implemented (2026-02)
- JWT auth (login/register/logout/me) with httpOnly cookies + admin seeding
- Mitra CRUD (cascade delete to products & transactions)
- Product CRUD (Mitra, Menu Sarapan, Jumlah, Harga Mitra, Harga Jual, profit preview)
- Transaction CRUD with auto-calc total_pendapatan + profit; filter by date
- Dashboard endpoint: today's metrics + mitra cards grouping
- Sales chart endpoint with daily (7d) / weekly (8w) / monthly (6mo)
- Login + Register pages (red theme, food image)
- Dashboard with 4 metric cards (sales/profit/items/mitra), mitra cards grid, sales chart with tabs
- Pages: Mitra, Produk (new item dialog), Transaksi (filter + input dialog + print per row)
- Export PDF report (jspdf + autotable)
- Cetak struk receipt template (window.print with CSS @media print)
- Fixed: CRA dev overlay swallow for ResizeObserver warning
- A11y: DialogDescription on all dialogs

## Personas
- UMKM owner penitipan sarapan – tracks daily titipan from multiple mitra, prints receipts, exports daily reports.

## Backlog
- P1: Edit produk via UI (only delete exposed currently)
- P1: Multi-user data isolation (currently shared)
- P2: Inventory tracking vs jumlah titipan (sisa stok = jumlah - jumlah_terjual aggregated)
- P2: WhatsApp/sms recap ke mitra
- P2: Payout/settlement page (total payable per mitra = harga_mitra * jumlah_terjual)
- P2: Rate limit & brute-force protection on /api/auth/login
- P3: PWA/offline support for warung
