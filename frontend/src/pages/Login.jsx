import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sandwich } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@sarapan.id");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.ok) {
      toast.success("Login berhasil");
      nav("/");
    } else {
      setErr(r.error);
      toast.error(r.error);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Form side */}
      <div className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-lg bg-red-600 flex items-center justify-center text-white">
              <Sandwich size={22} />
            </div>
            <div>
              <div className="font-heading text-xl font-bold text-slate-900 leading-none">
                Sarapan
              </div>
              <div className="text-xs text-slate-500 mt-1">UMKM Manager</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
              Masuk Akun
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 mt-2">
              Selamat datang
            </h1>
            <p className="text-slate-500 mt-3 leading-relaxed">
              Kelola titipan sarapan dari mitra Anda dengan cepat dan rapi.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sarapan.id"
                className="mt-1.5 h-11 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="mt-1.5 h-11 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="login-password-input"
              />
            </div>

            {err && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="login-error">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium"
              data-testid="login-submit-button"
            >
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <p className="text-sm text-slate-500 mt-8 text-center">
            Belum punya akun?{" "}
            <Link to="/register" className="text-red-600 font-medium hover:underline" data-testid="goto-register">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>

      {/* Image side */}
      <div className="hidden lg:block relative">
        <img
          src="https://images.pexels.com/photos/37614617/pexels-photo-37614617.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Sarapan Indonesia"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
            Untuk UMKM Indonesia
          </div>
          <h2 className="font-heading text-4xl font-bold mt-3 leading-tight">
            Hitung untung,<br/>kelola titipan, dengan tenang.
          </h2>
          <p className="text-white/80 mt-4 max-w-md leading-relaxed">
            Pantau penjualan harian dari setiap mitra, hitung profit otomatis, dan cetak struk dengan satu klik.
          </p>
        </div>
      </div>
    </div>
  );
}
