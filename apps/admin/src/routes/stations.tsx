import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCents, type Session, type PcStation } from "@/lib/types";
import { PDV } from "@/components/PDV";

export function StationsPage() {
  const [stations, setStations] = useState<PcStation[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [pdvStation, setPdvStation] = useState<PcStation | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: pcs }, { data: sessions }] = await Promise.all([
      supabase.from("pc_stations").select("*").order("station_number"),
      supabase.from("sessions").select("*, customer:profiles(*), station:pc_stations(*)").eq("status", "active"),
    ]);
    setStations(pcs ?? []);
    setActiveSessions((sessions as Session[]) ?? []);
    setLoading(false);
  }

  async function endSession(sessionId: string) {
    await supabase.from("sessions").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", sessionId);
    load();
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("stations")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sessionByStation = Object.fromEntries(activeSessions.map((s) => [s.station_id, s]));
  const freeStations = stations.filter((s) => s.is_active && !sessionByStation[s.id]);

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">PCs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeSessions.length} ocupado{activeSessions.length !== 1 ? "s" : ""} · {freeStations.length} livre{freeStations.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stations.map((pc) => {
          const session = sessionByStation[pc.id];
          const occupied = !!session;
          const timeLeft = session?.planned_end_at
            ? Math.max(0, Math.round((new Date(session.planned_end_at).getTime() - Date.now()) / 60_000))
            : null;

          return (
            <div
              key={pc.id}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{
                background: occupied ? "rgba(251,191,36,0.06)" : "var(--surface)",
                border: `1px solid ${occupied ? "rgba(251,191,36,0.35)" : "var(--dim)"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-white">{pc.label ?? `PC-${pc.station_number}`}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: occupied ? "rgba(251,191,36,0.15)" : "rgba(34,197,94,0.15)",
                    color: occupied ? "var(--amber)" : "#22c55e",
                  }}
                >
                  {occupied ? "OCUPADO" : "LIVRE"}
                </span>
              </div>

              {occupied && session ? (
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-white">{session.customer?.full_name ?? session.customer?.email ?? "—"}</p>
                    <p className="text-xs text-slate-500">{session.package_type.replace("_", " ").toUpperCase()}</p>
                    <p className="text-xs text-slate-500">
                      Início: {new Date(session.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {timeLeft !== null && (
                      <p className="text-xs font-bold" style={{ color: timeLeft < 10 ? "#f87171" : "var(--amber)" }}>
                        {timeLeft}min restantes
                      </p>
                    )}
                    <p className="text-xs text-slate-500">{formatCents(session.price_cents)}</p>
                  </div>
                  <button
                    onClick={() => endSession(session.id)}
                    className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                  >
                    Encerrar
                  </button>
                </>
              ) : (
                <>
                  {pc.specs && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] text-slate-500">{pc.specs.gpu}</p>
                      <p className="text-[11px] text-slate-600">{pc.specs.monitor}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setPdvStation(pc)}
                    className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                    style={{ background: "var(--amber)", color: "#09090f" }}
                  >
                    <Plus size={12} />
                    Abrir Sessão
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {pdvStation && (
        <PDV
          stations={freeStations}
          preselectedStation={pdvStation}
          onClose={() => setPdvStation(null)}
          onSuccess={() => { setPdvStation(null); load(); }}
        />
      )}
    </div>
  );
}
