import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  LayoutDashboard, Package, Receipt, Users, LogOut, Sandwich,
  Building2, Menu as MenuIcon,
} from "lucide-react";
import { formatDateID } from "@/lib/api";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
  { to: "/cabang", icon: Building2, label: "Cabang", testId: "nav-cabang" },
  { to: "/mitra", icon: Users, label: "Mitra", testId: "nav-mitra" },
  { to: "/products", icon: Package, label: "Produk", testId: "nav-products" },
  { to: "/transactions", icon: Receipt, label: "Transaksi", testId: "nav-transactions" },
];

function SidebarBody({ user, onLogout, onNavigate }) {
  return (
    <>
      <div className="px-6 py-6 border-b border-slate-200">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3"
          data-testid="sidebar-logo"
        >
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shrink-0">
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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
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
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div className="px-3 py-2 mb-2">
          <div
            className="text-sm font-semibold text-slate-800 truncate"
            data-testid="user-name"
          >
            {user?.name || "User"}
          </div>
          <div className="text-xs text-slate-500 truncate">{user?.email}</div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={onLogout}
          data-testid="logout-button"
        >
          <LogOut size={16} className="mr-2" /> Keluar
        </Button>
      </div>
    </>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = navItems.find((n) => n.to === loc.pathname)?.label || "Dashboard";

  const handleLogout = async () => {
    await logout();
    nav("/login");
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col no-print shrink-0">
        <SidebarBody user={user} onLogout={handleLogout} onNavigate={() => {}} />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 no-print">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-slate-700 shrink-0"
                  data-testid="mobile-menu-trigger"
                  aria-label="Buka menu"
                >
                  <MenuIcon size={22} />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-72 flex flex-col"
                data-testid="mobile-sidebar"
              >
                <VisuallyHidden>
                  <SheetTitle>Navigasi Menu</SheetTitle>
                  <SheetDescription>Menu navigasi utama aplikasi.</SheetDescription>
                </VisuallyHidden>
                <SidebarBody
                  user={user}
                  onLogout={async () => {
                    setMobileOpen(false);
                    await handleLogout();
                  }}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                {title}
              </div>
              <h1 className="font-heading text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 sm:mt-1 truncate">
                {title === "Dashboard" ? "Selamat datang kembali" : title}
              </h1>
            </div>
            <div className="hidden sm:block text-right text-sm shrink-0">
              <div className="text-slate-500 text-xs">Hari ini</div>
              <div
                className="text-slate-800 font-medium text-xs lg:text-sm"
                data-testid="header-date"
              >
                {formatDateID(new Date())}
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}