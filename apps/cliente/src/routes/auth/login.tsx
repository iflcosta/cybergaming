import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { AuthCard } from "@/components/AuthCard";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    setLoading(false);
    if (error) {
      toast.error("Email ou senha inválidos");
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <AuthCard title="Entrar" subtitle="Acesse sua conta para jogar">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          placeholder="seu@email.com"
        />
        <Field
          label="Senha"
          type="password"
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-opacity disabled:opacity-50"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p className="text-center text-xs text-[--muted]">
          Não tem conta?{" "}
          <Link to="/auth/cadastro" className="font-semibold" style={{ color: "var(--amber)" }}>
            Cadastre-se
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[--muted] uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full px-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] placeholder:text-[--dim] focus:outline-none focus:border-[--amber] transition-colors"
      />
    </div>
  );
}
