import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { AuthCard } from "@/components/AuthCard";

const GAMES = ["CS2", "Valorant", "League of Legends", "FIFA / FC", "Free Fire", "Fortnite", "Outro"];

export function OnboardingPage() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    phone: profile?.phone ?? "",
    birth_date: profile?.birth_date ?? "",
    cpf: profile?.cpf ?? "",
    main_game: "",
    main_game_other: "",
  });

  function set(key: keyof typeof form) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  function formatPhone(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function formatCPF(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast.error("Telefone inválido");
      return;
    }
    setLoading(true);
    const { error } = await updateProfile({
      phone: form.phone,
      birth_date: form.birth_date || null,
      cpf: form.cpf ? form.cpf.replace(/\D/g, "") : null,
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Perfil completo!");
    navigate({ to: "/home" });
  }

  return (
    <AuthCard
      title="Complete seu perfil"
      subtitle="Precisamos de mais algumas informações para finalizar seu cadastro"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Founding Member badge */}
        {profile?.is_founding_member && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
            style={{ background: "rgba(251,191,36,0.12)", color: "var(--amber)", border: "1px solid rgba(251,191,36,0.3)" }}
          >
            ★ Founding Member ativo — vouchers no seu email
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[--muted] uppercase tracking-wider">
            WhatsApp *
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone")(formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            required
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] placeholder:text-[--dim] focus:outline-none focus:border-[--amber] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[--muted] uppercase tracking-wider">
            Data de nascimento
          </label>
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => set("birth_date")(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] focus:outline-none focus:border-[--amber] transition-colors"
          />
          <p className="text-[10px] text-[--muted]">Necessário para torneios (menores de 18 com autorização)</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[--muted] uppercase tracking-wider">
            CPF
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form.cpf}
            onChange={(e) => set("cpf")(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] placeholder:text-[--dim] focus:outline-none focus:border-[--amber] transition-colors"
          />
          <p className="text-[10px] text-[--muted]">Opcional. Necessário para emissão de nota fiscal</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-opacity disabled:opacity-50 mt-2"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          {loading ? "Salvando…" : "Começar a jogar →"}
        </button>
      </form>
    </AuthCard>
  );
}
