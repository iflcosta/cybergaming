import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatCents, type Profile, type UserRole } from "@/lib/types";
import { useAuth } from "@/contexts/auth";

const ROLES: UserRole[] = ["customer", "staff", "admin"];

export function CustomersPage() {
  const { profile: me } = useAuth();
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function changeRole(c: Profile, role: UserRole) {
    if (c.id === me?.id) { toast.error("Você não pode alterar seu próprio cargo"); return; }
    const { data, error } = await supabase.rpc("set_user_role", { p_user_id: c.id, p_role: role });
    if (error || !data?.ok) { toast.error("Erro ao alterar cargo"); return; }
    toast.success(`${c.full_name ?? c.email} agora é ${role}`);
    load(search);
  }

  async function toggleFounding(c: Profile) {
    const { data, error } = await supabase.rpc("set_founding_member", { p_user_id: c.id, p_value: !c.is_founding_member });
    if (error || !data?.ok) { toast.error("Erro ao atualizar Founding Member"); return; }
    toast.success(`${c.full_name ?? c.email} ${!c.is_founding_member ? "agora é" : "não é mais"} Founding Member`);
    load(search);
  }

  async function load(q = "") {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    if (q.length >= 2) {
      query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
    }
    const { data } = await query;
    setCustomers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function onSearch(v: string) {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(v), 300);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{customers.length} cadastrados</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none"
          style={{ background: "var(--surface)", borderColor: "var(--dim)" }}
        />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Carregando…</div>
      ) : customers.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <p className="text-slate-500 text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--dim)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--surface)" }}>
              <tr>
                {["Nome", "Contato", "Créditos", "Perfil", "Cadastro", me?.role === "admin" ? "Cargo" : ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--dim)" }}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">{c.full_name ?? "—"}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 font-bold text-xs" style={{ color: "var(--amber)" }}>
                    {formatCents(c.credits_balance)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleFounding(c)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors"
                        style={c.is_founding_member
                          ? { background: "rgba(251,191,36,0.15)", color: "var(--amber)" }
                          : { background: "var(--bg)", color: "var(--muted)", border: "1px dashed var(--dim)" }}
                        title={c.is_founding_member ? "Clique para remover Founding Member" : "Clique para tornar Founding Member"}
                      >
                        ★ FOUNDING
                      </button>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: c.role === "admin" ? "rgba(167,139,250,0.15)" : c.role === "staff" ? "rgba(96,165,250,0.15)" : "rgba(100,116,139,0.1)",
                          color: c.role === "admin" ? "#a78bfa" : c.role === "staff" ? "#60a5fa" : "var(--muted)",
                        }}
                      >
                        {c.role.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  {me?.role === "admin" && (
                    <td className="px-4 py-3">
                      <select
                        value={c.role}
                        onChange={(e) => changeRole(c, e.target.value as UserRole)}
                        disabled={c.id === me.id}
                        className="text-xs px-2 py-1 rounded border text-white disabled:opacity-40 focus:outline-none"
                        style={{ background: "var(--bg)", borderColor: "var(--dim)" }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
