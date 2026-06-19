import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, Receipt, Users, LogOut, Sandwich } from "lucide-react";
import { formatDateID } from "@/lib/api";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
  { to: "/mitra", icon: Users, label: "Mitra", testId: "nav-mitra" },
  { to: "/products", icon: Package, label: "Produk", testId: "nav-products" },
  { to: "/transactions", icon: Receipt, label: "Transaksi", testId: "nav-transactions" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const title = navItems.find((n) => n.to === loc.pathname)?.label || "Dashboard";

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col no-print">
        <div className="px-6 py-6 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-3" data-testid="sidebar-logo">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white">
              <Sandwich size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="font-heading text-lg font-bold tracking-tight text-slate-900 leading-none">
                Sarapan
              </div>
              <div className="text-xs text-slate-500 mt-1">UMKM Manager</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-semibold text-slate-800 truncate" data-testid="user-name">
              {user?.name || "User"}
            </div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={async () => {
              await logout();
              nav("/login");
            }}
            data-testid="logout-button"
          >
            <LogOut size={16} className="mr-2" /> Keluar
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 no-print">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                {title}
              </div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 mt-1">
                {title === "Dashboard" ? "Selamat datang kembali" : title}
              </h1>
            </div>
            <div className="text-right text-sm">
              <div className="text-slate-500 text-xs">Hari ini</div>
              <div className="text-slate-800 font-medium" data-testid="header-date">
                {formatDateID(new Date())}
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
