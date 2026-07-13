import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCents, PACKAGES, type Session, type PcStation } from "@/lib/types";
import { PDV } from "@/components/PDV";

type Tab = "active" | "today" | "all";

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [freeStations, setFreeStations] = useState<PcStation[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [showPDV, setShowPDV] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [{ data: allSessions }, { data: allStations }, { data: activeSessions }] = await Promise.all([
      supabase
        .from("sessions")
        .select("*, customer:profiles(*), station:pc_stations(*)")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("pc_stations").select("*").order("station_number"),
      supabase.from("sessions").select("station_id").eq("status", "active"),
    ]);

    setSessions((allSessions as Session[]) ?? []);
    const occupiedIds = new Set((activeSessions ?? []).map((s) => s.station_id));
    setFreeStations((allStations ?? []).filter((s) => s.is_active && !occupiedIds.has(s.id)));
    setLoading(false);
  }

  async function endSession(id: string) {
    await supabase.from("sessions").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("sessions-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = sessions.filter((s) => {
    if (tab === "active") return s.status === "active";
    if (tab === "today") return true;
    return true;
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: "active", label: `Ativas (${sessions.filter((s) => s.status === "active").length})` },
    { key: "today",  label: `Hoje (${sessions.length})` },
  ];

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Sessões</h1>
        <button
          onClick={() => setShowPDV(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          <Plus size={16} />
          Nova Sessão
        </button>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: "var(--surface)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
            style={{
              background: tab === t.key ? "var(--amber)" : "transparent",
              color: tab === t.key ? "#09090f" : "var(--muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <p className="text-slate-500 text-sm">Nenhuma sessão {tab === "active" ? "ativa" : "hoje"}</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--dim)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--surface)" }}>
              <tr>
                {["PC", "Cliente", "Pacote", "Início", "Término", "Valor", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--dim)" }}>
                  <td className="px-4 py-3 font-bold text-white">{s.station?.label ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{s.customer?.full_name ?? s.customer?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{PACKAGES[s.package_type]?.label}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--amber)" }}>
                    {s.planned_end_at ? new Date(s.planned_end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{formatCents(s.price_cents)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: s.status === "active" ? "rgba(251,191,36,0.15)" : "rgba(100,116,139,0.15)",
                        color: s.status === "active" ? "var(--amber)" : "var(--muted)",
                      }}
                    >
                      {s.status === "active" ? "ATIVA" : s.status === "completed" ? "CONCLUÍDA" : "CANCELADA"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.status === "active" && (
                      <button
                        onClick={() => endSession(s.id)}
                        className="text-xs px-2 py-1 rounded transition-colors"
                        style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        Encerrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPDV && (
        <PDV
          stations={freeStations}
          onClose={() => setShowPDV(false)}
          onSuccess={() => { setShowPDV(false); load(); }}
        />
      )}
    </div>
  );
}
