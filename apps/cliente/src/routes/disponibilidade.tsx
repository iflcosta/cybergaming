import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

interface HourSlot { hour: number; free_count: number; total_count: number }
interface StationStatus { station_number: number; label: string | null; is_occupied: boolean }

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function DisponibilidadePage() {
  const [day, setDay] = useState(todayISO());
  const [slots, setSlots] = useState<HourSlot[]>([]);
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: avail }, { data: live }] = await Promise.all([
      supabase.rpc("get_station_availability", { p_day: day }),
      supabase.rpc("get_public_station_status"),
    ]);
    setSlots((avail as HourSlot[]) ?? []);
    setStations((live as StationStatus[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("public-availability")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const occupied = stations.filter((s) => s.is_occupied).length;

  return (
    <div className="min-h-screen px-5 py-6 max-w-md mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/home" className="text-[--muted] text-sm">←</Link>
        <h1 className="text-lg font-black text-[--text]">Disponibilidade</h1>
      </div>

      {/* Live status */}
      <div className="rounded-xl p-4 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Agora na arena</p>
          <span className="text-xs font-black" style={{ color: occupied === stations.length ? "#f87171" : "#34d399" }}>
            {stations.length - occupied} livres / {stations.length}
          </span>
        </div>
        {loading ? (
          <p className="text-xs text-[--muted]">Carregando…</p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {stations.map((s) => (
              <div key={s.station_number} className="rounded-lg py-2.5 text-center"
                style={{
                  background: s.is_occupied ? "rgba(251,191,36,0.1)" : "rgba(52,211,153,0.1)",
                  border: `1px solid ${s.is_occupied ? "rgba(251,191,36,0.35)" : "rgba(52,211,153,0.35)"}`,
                }}>
                <p className="text-[10px] font-bold text-[--text]">{s.label ?? `PC${s.station_number}`}</p>
                <p className="text-[9px]" style={{ color: s.is_occupied ? "var(--amber)" : "#34d399" }}>
                  {s.is_occupied ? "ocupado" : "livre"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Availability by hour */}
      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-3">Vagas para reserva</p>
        <div className="flex gap-2 mb-4">
          {[0, 1, 2].map((offset) => {
            const d = todayISO(offset);
            const label = offset === 0 ? "Hoje" : offset === 1 ? "Amanhã" : new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
            return (
              <button key={d} onClick={() => { setDay(d); setLoading(true); }}
                className="flex-1 py-2 rounded-lg text-xs font-bold capitalize"
                style={{
                  background: day === d ? "var(--amber)" : "var(--bg)",
                  color: day === d ? "#09090f" : "var(--text)",
                  border: `1px solid ${day === d ? "var(--amber)" : "var(--dim)"}`,
                }}>
                {label}
              </button>
            );
          })}
        </div>
        {loading ? (
          <p className="text-xs text-[--muted]">Carregando…</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {slots.map((s) => {
              const pct = s.total_count > 0 ? s.free_count / s.total_count : 0;
              const color = pct === 0 ? "#f87171" : pct < 0.4 ? "var(--amber)" : "#34d399";
              return (
                <div key={s.hour} className="flex items-center gap-3">
                  <span className="text-xs text-[--muted] w-10">{s.hour}h</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
                  </div>
                  <span className="text-xs font-bold w-16 text-right" style={{ color }}>
                    {s.free_count}/{s.total_count} livres
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link to="/reservas" className="block mt-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider text-center"
        style={{ background: "var(--amber)", color: "#09090f" }}>
        Fazer uma reserva
      </Link>
    </div>
  );
}
