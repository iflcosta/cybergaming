import { useEffect, useState } from "react";
import { Monitor, Clock, DollarSign, Users, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCents, type Session } from "@/lib/types";
import { PDV } from "@/components/PDV";
import { EndSessionModal } from "@/components/EndSessionModal";
import type { PcStation } from "@/lib/types";

interface Stats {
  activeSessions: number;
  totalPCs: number;
  revenueToday: number;
  customersToday: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ activeSessions: 0, totalPCs: 10, revenueToday: 0, customersToday: 0 });
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [stations, setStations] = useState<PcStation[]>([]);
  const [showPDV, setShowPDV] = useState(false);
  const [endSession, setEndSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: pcs }, { data: sessions }, { data: txToday }] = await Promise.all([
      supabase.from("pc_stations").select("*").order("station_number"),
      supabase
        .from("sessions")
        .select("*, customer:profiles(*), station:pc_stations(*)")
        .eq("status", "active"),
      supabase
        .from("transactions")
        .select("amount_cents, customer_id")
        .eq("status", "paid")
        .gte("created_at", today.toISOString()),
    ]);

    const revenue = (txToday ?? []).reduce((acc, t) => acc + (t.amount_cents ?? 0), 0);
    const uniqueCustomers = new Set((txToday ?? []).map((t) => t.customer_id)).size;

    setStations(pcs ?? []);
    setActiveSessions((sessions as Session[]) ?? []);
    setStats({
      totalPCs: pcs?.length ?? 10,
      activeSessions: sessions?.length ?? 0,
      revenueToday: revenue,
      customersToday: uniqueCustomers,
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const occupiedStationIds = new Set(activeSessions.map((s) => s.station_id));
  const freeStations = stations.filter((s) => s.is_active && !occupiedStationIds.has(s.id));

  const statCards = [
    { label: "PCs Ocupados",   value: loading ? "—" : `${stats.activeSessions} / ${stats.totalPCs}`, color: "#34d399", icon: Monitor },
    { label: "Sessões ativas", value: loading ? "—" : String(stats.activeSessions),                   color: "var(--amber)", icon: Clock },
    { label: "Receita hoje",   value: loading ? "—" : formatCents(stats.revenueToday),                color: "#60a5fa", icon: DollarSign },
    { label: "Clientes hoje",  value: loading ? "—" : String(stats.customersToday),                  color: "#a78bfa", icon: Users },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visão geral em tempo real</p>
        </div>
        <button
          onClick={() => setShowPDV(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          <Plus size={16} />
          Nova Sessão
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</p>
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* PC Grid */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Status dos PCs</h2>
        <div className="grid grid-cols-5 gap-3">
          {stations.map((pc) => {
            const session = activeSessions.find((s) => s.station_id === pc.id);
            const occupied = !!session;
            const timeLeft = session?.planned_end_at
              ? Math.max(0, Math.round((new Date(session.planned_end_at).getTime() - Date.now()) / 60_000))
              : null;
            return (
              <div
                key={pc.id}
                className="rounded-lg p-3 flex flex-col gap-1"
                style={{
                  background: occupied ? "rgba(251,191,36,0.08)" : "var(--surface)",
                  border: `1px solid ${occupied ? "rgba(251,191,36,0.4)" : "var(--dim)"}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">PC-{pc.station_number.toString().padStart(2, "0")}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: occupied ? "var(--amber)" : "#22c55e" }}
                  />
                </div>
                {occupied && session ? (
                  <>
                    <p className="text-[10px] text-slate-400 truncate">
                      {session.customer?.full_name?.split(" ")[0] ?? "—"}
                    </p>
                    {timeLeft !== null && (
                      <p className="text-[10px]" style={{ color: timeLeft < 10 ? "#f87171" : "var(--muted)" }}>
                        {timeLeft}min
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-green-500">Livre</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active sessions list */}
      {activeSessions.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Sessões em andamento</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--dim)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface)" }}>
                <tr>
                  {["PC", "Cliente", "Pacote", "Início", "Término previsto"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--dim)" }}>
                    <td className="px-4 py-3 font-bold text-white">{s.station?.label ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{s.customer?.full_name ?? s.customer?.email ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs uppercase">{s.package_type.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--amber)" }}>
                      {s.planned_end_at ? new Date(s.planned_end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEndSession(s)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        Encerrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPDV && (
        <PDV
          stations={freeStations}
          onClose={() => setShowPDV(false)}
          onSuccess={() => { setShowPDV(false); load(); }}
        />
      )}
      {endSession && (
        <EndSessionModal
          session={endSession}
          onClose={() => setEndSession(null)}
          onSuccess={() => { setEndSession(null); load(); }}
        />
      )}
    </div>
  );
}
