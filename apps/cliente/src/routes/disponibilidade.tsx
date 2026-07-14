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

function nextWeekdayISO(dow: number) {
  const d = new Date();
  const diff = (dow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function slotColor(pct: number) {
  return pct === 0 ? "#f87171" : pct < 0.4 ? "var(--amber)" : "#34d399";
}

function HourBars({ slots }: { slots: HourSlot[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {slots.map((s) => {
        const pct = s.total_count > 0 ? s.free_count / s.total_count : 0;
        const color = slotColor(pct);
        return (
          <div key={s.hour} className="flex items-center gap-3">
            <span className="text-xs text-[--muted] w-10">{s.hour}h</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
              <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
            </div>
            <span className="text-xs font-bold w-14 text-right" style={{ color }}>
              {s.free_count}/{s.total_count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DisponibilidadePage() {
  const [tab, setTab] = useState<"dia" | "semana">("dia");

  // "Hoje" mode
  const [day, setDay] = useState(todayISO());
  const [slots, setSlots] = useState<HourSlot[]>([]);
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // "Padrão semanal" mode
  const [weekSlots, setWeekSlots] = useState<Record<number, HourSlot[]>>({});
  const [weekLoading, setWeekLoading] = useState(false);
  const [expandedDow, setExpandedDow] = useState<number | null>(null);

  async function load() {
    const [{ data: avail }, { data: live }] = await Promise.all([
      supabase.rpc("get_station_availability", { p_day: day }),
      supabase.rpc("get_public_station_status"),
    ]);
    setSlots((avail as HourSlot[]) ?? []);
    setStations((live as StationStatus[]) ?? []);
    setLoading(false);
  }

  async function loadWeek() {
    setWeekLoading(true);
    const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== 1); // arena fechada seg
    const results = await Promise.all(
      days.map((dow) => supabase.rpc("get_station_availability", { p_day: nextWeekdayISO(dow) }))
    );
    const next: Record<number, HourSlot[]> = {};
    days.forEach((dow, i) => { next[dow] = (results[i].data as HourSlot[]) ?? []; });
    setWeekSlots(next);
    setWeekLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("public-availability")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => { load(); loadWeek(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  useEffect(() => {
    if (tab === "semana" && Object.keys(weekSlots).length === 0) loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const occupied = stations.filter((s) => s.is_occupied).length;

  return (
    <div className="min-h-screen px-5 py-6 max-w-md mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/home" className="text-[--muted] text-sm py-1">←</Link>
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

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4 p-1 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        {(["dia", "semana"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-md text-xs font-bold"
            style={{ background: tab === t ? "var(--amber)" : "transparent", color: tab === t ? "#09090f" : "var(--muted)" }}>
            {t === "dia" ? "Por dia" : "Padrão semanal"}
          </button>
        ))}
      </div>

      {tab === "dia" ? (
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-3">Vagas para reserva</p>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {Array.from({ length: 14 }, (_, i) => i).map((offset) => {
              const d = todayISO(offset);
              const dt = new Date(d + "T12:00:00");
              const label = offset === 0 ? "Hoje" : offset === 1 ? "Amanhã" : dt.toLocaleDateString("pt-BR", { weekday: "short" });
              const dateNum = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              return (
                <button key={d} onClick={() => { setDay(d); setLoading(true); }}
                  className="flex-shrink-0 px-3.5 py-2.5 rounded-lg text-xs font-bold capitalize flex flex-col items-center gap-0.5"
                  style={{
                    background: day === d ? "var(--amber)" : "var(--bg)",
                    color: day === d ? "#09090f" : "var(--text)",
                    border: `1px solid ${day === d ? "var(--amber)" : "var(--dim)"}`,
                  }}>
                  <span>{label}</span>
                  <span className="text-[9px] font-normal opacity-70">{dateNum}</span>
                </button>
              );
            })}
          </div>
          {loading ? <p className="text-xs text-[--muted]">Carregando…</p> : <HourBars slots={slots} />}
        </div>
      ) : (
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-1">Padrão por dia da semana</p>
          <p className="text-[10px] text-[--muted] mb-4">
            Pra quem quer reserva mensal — mostra a próxima ocorrência de cada dia. Toque num dia pra ver hora a hora.
          </p>
          {weekLoading ? (
            <p className="text-xs text-[--muted]">Carregando…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[0, 2, 3, 4, 5, 6, 1].filter((d) => weekSlots[d]).map((dow) => {
                const daySlots = weekSlots[dow] ?? [];
                const isExpanded = expandedDow === dow;
                return (
                  <div key={dow} className="rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--dim)" }}>
                    <button
                      onClick={() => setExpandedDow(isExpanded ? null : dow)}
                      className="w-full flex items-center gap-2 px-3 py-3"
                    >
                      <span className="text-left w-16">
                        <span className="block text-xs font-bold text-[--text]">{WEEKDAYS[dow].slice(0, 3)}</span>
                        <span className="block text-[9px] text-[--muted]">
                          {new Date(nextWeekdayISO(dow) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </span>
                      <div className="flex-1 flex gap-0.5">
                        {daySlots.map((s) => {
                          const pct = s.total_count > 0 ? s.free_count / s.total_count : 0;
                          return <div key={s.hour} className="flex-1 h-4 rounded-sm" style={{ background: slotColor(pct) }} />;
                        })}
                      </div>
                      <span className="text-[--muted] text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <HourBars slots={daySlots} />
                        <a
                          href={`/reservas?mode=recorrente&dow=${dow}`}
                          className="block mt-3 py-2.5 rounded-lg text-center text-xs font-bold uppercase tracking-wider"
                          style={{ background: "var(--amber)", color: "#09090f" }}
                        >
                          Reservar mensal nesse dia
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Link to="/reservas" className="block mt-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider text-center"
        style={{ background: "var(--amber)", color: "#09090f" }}>
        Fazer uma reserva
      </Link>
    </div>
  );
}
