import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

interface Reservation {
  id: string;
  starts_at: string;
  duration_min: number;
  status: ReservationStatus;
  note: string | null;
  station?: { label: string | null; station_number: number } | null;
}

const STATUS_LABELS: Record<ReservationStatus, { label: string; color: string }> = {
  pending:   { label: "Aguardando confirmação", color: "var(--amber)" },
  confirmed: { label: "Confirmada ✓", color: "#34d399" },
  cancelled: { label: "Cancelada", color: "var(--muted)" },
  completed: { label: "Concluída", color: "#60a5fa" },
  no_show:   { label: "Não compareceu", color: "#f87171" },
};

const DURATIONS = [60, 120, 180, 240];

export function ReservasPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("reservations")
      .select("*, station:pc_stations(label, station_number)")
      .eq("customer_id", user.id)
      .order("starts_at", { ascending: false })
      .limit(20);
    setReservations((data as Reservation[]) ?? []);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("my-reservations")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `customer_id=eq.${user.id}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !date || !time) { toast.error("Escolha data e horário"); return; }
    const starts = new Date(`${date}T${time}:00`);
    if (starts.getTime() < Date.now() + 30 * 60_000) {
      toast.error("Reserve com pelo menos 30min de antecedência");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reservations").insert({
      customer_id: user.id,
      starts_at: starts.toISOString(),
      duration_min: duration,
      status: "pending",
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao criar reserva"); return; }
    toast.success("Reserva enviada! Aguarde a confirmação.");
    setDate(""); setTime(""); setNote("");
    load();
  }

  async function cancel(r: Reservation) {
    const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", r.id);
    if (error) { toast.error("Erro ao cancelar"); return; }
    toast.success("Reserva cancelada");
    load();
  }

  return (
    <div className="min-h-screen px-5 py-6 max-w-md mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/home" className="text-[--muted] text-sm">←</Link>
        <h1 className="text-lg font-black text-[--text]">Reservas</h1>
      </div>

      {/* New reservation */}
      <form onSubmit={create} className="rounded-xl p-4 mb-6 flex flex-col gap-3"
        style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Nova reserva</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[--muted] uppercase">Data</label>
            <input type="date" value={date} min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] focus:outline-none focus:border-[--amber]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[--muted] uppercase">Horário</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] focus:outline-none focus:border-[--amber]" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[--muted] uppercase">Duração</label>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button key={d} type="button" onClick={() => setDuration(d)}
                className="py-2 rounded-lg text-xs font-bold"
                style={{
                  background: duration === d ? "var(--amber)" : "var(--bg)",
                  color: duration === d ? "#09090f" : "var(--text)",
                  border: `1px solid ${duration === d ? "var(--amber)" : "var(--dim)"}`,
                }}>
                {d / 60}h
              </button>
            ))}
          </div>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação (opcional)"
          className="px-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] placeholder:text-[--dim] focus:outline-none focus:border-[--amber]" />
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50"
          style={{ background: "var(--amber)", color: "#09090f" }}>
          {saving ? "Enviando…" : "Reservar"}
        </button>
        <p className="text-[10px] text-[--muted]">Funcionamento: ter–dom, 10h às 22h · A equipe confirma sua reserva e escolhe o PC</p>
      </form>

      {/* My reservations */}
      <div className="flex flex-col gap-2">
        {reservations.map((r) => {
          const meta = STATUS_LABELS[r.status];
          const dt = new Date(r.starts_at);
          const cancellable = ["pending", "confirmed"].includes(r.status) && dt.getTime() > Date.now();
          return (
            <div key={r.id} className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
              <div>
                <p className="text-sm font-bold text-[--text]">
                  {dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} · {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-xs" style={{ color: meta.color }}>
                  {meta.label}{r.station ? ` · ${r.station.label ?? `PC-${r.station.station_number}`}` : ""}
                </p>
              </div>
              {cancellable && (
                <button onClick={() => cancel(r)} className="text-xs text-[--muted] underline">Cancelar</button>
              )}
            </div>
          );
        })}
        {reservations.length === 0 && (
          <p className="text-xs text-[--muted] text-center py-4">Você ainda não tem reservas</p>
        )}
      </div>
    </div>
  );
}
