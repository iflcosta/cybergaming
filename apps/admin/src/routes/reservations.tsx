import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatDuration, type Profile, type PcStation } from "@/lib/types";

type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

interface Reservation {
  id: string;
  customer_id: string;
  station_id: string | null;
  starts_at: string;
  duration_min: number;
  status: ReservationStatus;
  note: string | null;
  created_at: string;
  customer?: Profile;
  station?: PcStation | null;
}

const STATUS_META: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: "PENDENTE",    color: "var(--amber)", bg: "rgba(251,191,36,0.15)" },
  confirmed: { label: "CONFIRMADA",  color: "#34d399",      bg: "rgba(52,211,153,0.15)" },
  cancelled: { label: "CANCELADA",   color: "var(--muted)", bg: "rgba(100,116,139,0.15)" },
  completed: { label: "CONCLUÍDA",   color: "#60a5fa",      bg: "rgba(96,165,250,0.15)" },
  no_show:   { label: "NÃO VEIO",    color: "#f87171",      bg: "rgba(239,68,68,0.15)" },
};

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stations, setStations] = useState<PcStation[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: res }, { data: pcs }] = await Promise.all([
      supabase
        .from("reservations")
        .select("*, customer:profiles(*), station:pc_stations(*)")
        .gte("starts_at", new Date(Date.now() - 24 * 3600_000).toISOString())
        .order("starts_at"),
      supabase.from("pc_stations").select("*").order("station_number"),
    ]);
    setReservations((res as Reservation[]) ?? []);
    setStations(pcs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("reservations-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function setStatus(r: Reservation, status: ReservationStatus, station_id?: string) {
    const patch: Record<string, unknown> = { status };
    if (station_id) patch.station_id = station_id;
    const { error } = await supabase.from("reservations").update(patch).eq("id", r.id);
    if (error) { toast.error("Erro ao atualizar reserva"); return; }
    toast.success(`Reserva ${STATUS_META[status].label.toLowerCase()}`);
  }

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  const upcoming = reservations.filter((r) => ["pending", "confirmed"].includes(r.status));
  const past = reservations.filter((r) => !["pending", "confirmed"].includes(r.status));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Reservas</h1>
        <p className="text-sm text-slate-500 mt-0.5">{upcoming.length} pendentes/confirmadas</p>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <CalendarClock className="mx-auto mb-2 text-slate-600" size={24} />
          <p className="text-slate-500 text-sm">Nenhuma reserva</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...upcoming, ...past].map((r) => {
            const meta = STATUS_META[r.status];
            const dt = new Date(r.starts_at);
            const isActionable = ["pending", "confirmed"].includes(r.status);
            return (
              <div key={r.id} className="rounded-lg p-4 flex flex-wrap items-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
                <div className="min-w-[90px]">
                  <p className="text-sm font-black text-white">
                    {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </p>
                  <p className="text-xs" style={{ color: "var(--amber)" }}>
                    {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {formatDuration(r.duration_min)}
                  </p>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-semibold text-white">{r.customer?.full_name ?? r.customer?.email ?? "—"}</p>
                  <p className="text-xs text-slate-500">
                    {r.station ? (r.station.label ?? `PC-${r.station.station_number}`) : "PC a definir"}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
                {isActionable && (
                  <div className="flex items-center gap-2">
                    {r.status === "pending" && (
                      <>
                        {!r.station_id && (
                          <select
                            defaultValue=""
                            onChange={(e) => e.target.value && setStatus(r, "confirmed", e.target.value)}
                            className="text-xs px-2 py-1.5 rounded border text-white"
                            style={{ background: "var(--bg)", borderColor: "var(--dim)" }}
                          >
                            <option value="" disabled>Confirmar no PC…</option>
                            {stations.filter((s) => s.is_active).map((s) => (
                              <option key={s.id} value={s.id}>{s.label ?? `PC-${s.station_number}`}</option>
                            ))}
                          </select>
                        )}
                        {r.station_id && (
                          <button onClick={() => setStatus(r, "confirmed")} className="text-xs px-2.5 py-1 rounded font-bold" style={{ background: "#34d399", color: "#09090f" }}>
                            Confirmar
                          </button>
                        )}
                      </>
                    )}
                    {r.status === "confirmed" && (
                      <>
                        <button onClick={() => setStatus(r, "completed")} className="text-xs px-2.5 py-1 rounded" style={{ color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}>
                          Compareceu
                        </button>
                        <button onClick={() => setStatus(r, "no_show")} className="text-xs px-2.5 py-1 rounded" style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                          Não veio
                        </button>
                      </>
                    )}
                    <button onClick={() => setStatus(r, "cancelled")} className="text-xs px-2.5 py-1 rounded text-slate-500" style={{ border: "1px solid var(--dim)" }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
