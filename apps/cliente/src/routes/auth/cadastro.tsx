import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { AuthCard } from "@/components/AuthCard";

export function CadastroPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  function set(key: keyof typeof form) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.name);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Conta criada! Complete seu perfil.");
    navigate({ to: "/onboarding" });
  }

  return (
    <AuthCard title="Criar conta" subtitle="Entre para a comunidade da arena">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nome completo" type="text" value={form.name} onChange={set("name")} placeholder="João Silva" />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com" />
        <Field label="Senha" type="password" value={form.password} onChange={set("password")} placeholder="Mín. 6 caracteres" />
        <Field label="Confirmar senha" type="password" value={form.confirm} onChange={set("confirm")} placeholder="••••••••" />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-opacity disabled:opacity-50"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          {loading ? "Criando conta…" : "Criar conta"}
        </button>

        <p className="text-center text-xs text-[--muted]">
          Já tem conta?{" "}
          <Link to="/auth/login" className="font-semibold" style={{ color: "var(--amber)" }}>
            Entrar
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

function Field({
  label, type, value, onChange, placeholder,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[--muted] uppercase tracking-wider">{label}</label>
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
