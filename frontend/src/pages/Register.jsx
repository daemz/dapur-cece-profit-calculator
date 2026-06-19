import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sandwich } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await register(name, email, password);
    setLoading(false);
    if (r.ok) {
      toast.success("Pendaftaran berhasil");
      nav("/");
    } else {
      setErr(r.error);
      toast.error(r.error);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
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
              Daftar Akun Baru
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 mt-2">
              Mulai usaha Anda
            </h1>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
                className="mt-1.5 h-11 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="register-name-input"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                className="mt-1.5 h-11 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                data-testid="register-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="mt-1.5 h-11 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
                minLength={6}
                data-testid="register-password-input"
              />
            </div>

            {err && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="register-error">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium"
              data-testid="register-submit-button"
            >
              {loading ? "Memproses..." : "Daftar"}
            </Button>
          </form>

          <p className="text-sm text-slate-500 mt-8 text-center">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-red-600 font-medium hover:underline" data-testid="goto-login">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block relative">
        <img
          src="https://images.pexels.com/photos/37614617/pexels-photo-37614617.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Sarapan Indonesia"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
      </div>
    </div>
  );
}
