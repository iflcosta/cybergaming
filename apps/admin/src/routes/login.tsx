import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    setLoading(false);
    if (error) { toast.error("Email ou senha inválidos"); return; }
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm p-8 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <div className="mb-8">
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--amber)" }}>
            Cyber Brasil Arena
          </p>
          <h1 className="text-xl font-black text-white">Admin Panel</h1>
          <p className="text-sm text-slate-500 mt-1">Acesso restrito à equipe</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="staff@arena.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none transition-colors"
              style={{ background: "var(--bg)", borderColor: "var(--dim)" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none transition-colors"
              style={{ background: "var(--bg)", borderColor: "var(--dim)" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50 mt-2"
            style={{ background: "var(--amber)", color: "#09090f" }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
