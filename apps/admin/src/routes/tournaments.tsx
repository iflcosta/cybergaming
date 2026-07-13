import { useEffect, useState } from "react";
import { Plus, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/types";

type TournamentStatus = "registration_open" | "registration_closed" | "in_progress" | "completed" | "cancelled";
type TournamentType = "monthly" | "quarterly";

interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  game: string;
  status: TournamentStatus;
  scheduled_date: string;
  max_teams: number;
  entry_fee_cents: number;
  prize_pool_cents: number;
}

interface Team {
  id: string;
  name: string;
  status: string;
  placement: number | null;
  captain?: { full_name: string | null; email: string };
}

const STATUS_META: Record<TournamentStatus, { label: string; color: string }> = {
  registration_open: { label: "Inscrições abertas", color: "#34d399" },
  registration_closed: { label: "Inscrições encerradas", color: "var(--amber)" },
  in_progress: { label: "Em andamento", color: "#60a5fa" },
  completed: { label: "Concluído", color: "var(--muted)" },
  cancelled: { label: "Cancelado", color: "#f87171" },
};

export function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  async function load() {
    const { data } = await supabase.from("tournaments").select("*").order("scheduled_date", { ascending: false });
    setTournaments((data as Tournament[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("tournaments-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function toggle(t: Tournament) {
    if (expanded === t.id) { setExpanded(null); return; }
    setExpanded(t.id);
    const { data } = await supabase.from("teams").select("*, captain:profiles(full_name, email)").eq("tournament_id", t.id).order("created_at");
    setTeams((data as Team[]) ?? []);
  }

  async function setStatus(t: Tournament, status: TournamentStatus) {
    const { error } = await supabase.from("tournaments").update({ status }).eq("id", t.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(`${t.name} — ${STATUS_META[status].label}`);
  }

  async function setPlacement(team: Team, placement: number | null) {
    const { error } = await supabase.from("teams").update({ placement }).eq("id", team.id);
    if (error) { toast.error("Erro ao salvar colocação"); return; }
    setTeams((prev) => prev.map((x) => x.id === team.id ? { ...x, placement } : x));
  }

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Torneios</h1>
          <p className="text-sm text-slate-500 mt-0.5">{tournaments.length} cadastrados</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          <Plus size={16} />
          Novo Torneio
        </button>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <Trophy className="mx-auto mb-2 text-slate-600" size={24} />
          <p className="text-slate-500 text-sm">Nenhum torneio cadastrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((t) => {
            const meta = STATUS_META[t.status];
            return (
              <div key={t.id} className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
                <div className="flex flex-wrap items-center gap-4 cursor-pointer" onClick={() => toggle(t)}>
                  <div className="min-w-[90px]">
                    <p className="text-sm font-black text-white">
                      {new Date(t.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">{t.type === "monthly" ? "mensal" : "trimestral"}</p>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.game} · até {t.max_teams} times · entrada {formatCents(t.entry_fee_cents)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: "var(--amber)" }}>{formatCents(t.prize_pool_cents)}</p>
                    <p className="text-[10px] text-slate-500">premiação</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${meta.color}22`, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>

                {expanded === t.id && (
                  <div className="mt-3 pt-3 border-t flex flex-col gap-3" style={{ borderColor: "var(--dim)" }}>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(STATUS_META) as TournamentStatus[]).map((s) => (
                        <button key={s} onClick={() => setStatus(t, s)}
                          className="text-xs px-2.5 py-1 rounded"
                          style={{
                            background: t.status === s ? STATUS_META[s].color : "var(--bg)",
                            color: t.status === s ? "#09090f" : "var(--muted)",
                            border: "1px solid var(--dim)",
                          }}>
                          {STATUS_META[s].label}
                        </button>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Times inscritos ({teams.length})</p>
                      {teams.length === 0 ? (
                        <p className="text-xs text-slate-600">Nenhum time inscrito ainda</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {teams.map((team) => (
                            <div key={team.id} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: "var(--bg)" }}>
                              <span className="text-sm text-white">{team.name}</span>
                              <span className="text-xs text-slate-500">{team.captain?.full_name ?? team.captain?.email}</span>
                              <input
                                type="number"
                                min={1}
                                placeholder="colocação"
                                value={team.placement ?? ""}
                                onChange={(e) => setPlacement(team, e.target.value ? parseInt(e.target.value) : null)}
                                className="w-20 px-2 py-1 rounded text-xs text-right border text-white focus:outline-none"
                                style={{ background: "var(--surface)", borderColor: "var(--dim)" }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", game: "CS2", type: "monthly" as TournamentType,
    scheduled_date: "", max_teams: 6, entry_fee: "150,00", prize_pool: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    const entry_fee_cents = Math.round(parseFloat(form.entry_fee.replace(",", ".") || "0") * 100);
    const prize_pool_cents = Math.round(parseFloat(form.prize_pool.replace(",", ".") || "0") * 100);
    if (!form.name.trim() || !form.scheduled_date) { toast.error("Preencha nome e data"); return; }
    setSaving(true);
    const { error } = await supabase.from("tournaments").insert({
      name: form.name.trim(), game: form.game, type: form.type,
      scheduled_date: form.scheduled_date, max_teams: form.max_teams,
      entry_fee_cents: isNaN(entry_fee_cents) ? 0 : entry_fee_cents,
      prize_pool_cents: isNaN(prize_pool_cents) ? 0 : prize_pool_cents,
    });
    if (error) { toast.error("Erro ao criar torneio"); setSaving(false); return; }
    toast.success("Torneio criado");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--dim)" }}>
          <h2 className="font-bold text-white text-sm">Novo Torneio</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <input placeholder="Nome do torneio" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={inputStyle} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Jogo" value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} className={inputCls} style={inputStyle} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TournamentType })} className={inputCls} style={inputStyle}>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className={inputCls} style={inputStyle} />
            <input type="number" min={2} placeholder="Máx. times" value={form.max_teams} onChange={(e) => setForm({ ...form, max_teams: parseInt(e.target.value) || 6 })} className={inputCls} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Entrada R$" value={form.entry_fee} onChange={(e) => setForm({ ...form, entry_fee: e.target.value })} className={inputCls} style={inputStyle} inputMode="decimal" />
            <input placeholder="Premiação R$" value={form.prize_pool} onChange={(e) => setForm({ ...form, prize_pool: e.target.value })} className={inputCls} style={inputStyle} inputMode="decimal" />
          </div>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50" style={{ background: "var(--amber)", color: "#09090f" }}>
            {saving ? "Criando…" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none";
const inputStyle = { background: "var(--bg)", borderColor: "var(--dim)" } as const;
