import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/billing";

type ReservationStatus = "awaiting_payment" | "confirmed" | "cancelled" | "completed" | "no_show" | "expired";

interface Reservation {
  id: string;
  starts_at: string;
  duration_min: number;
  station_count: number;
  status: ReservationStatus;
  price_cents: number;
  payment_deadline_at: string | null;
  is_recurring: boolean;
}

interface RecurringPlan {
  id: string;
  day_of_week: number;
  start_time: string;
  duration_min: number;
  month: string;
  occurrence_count: number;
  price_cents: number;
  status: "awaiting_payment" | "active" | "cancelled" | "expired";
  payment_deadline_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: "Aguardando pagamento", color: "var(--amber)" },
  confirmed: { label: "Confirmada ✓", color: "#34d399" },
  active: { label: "Ativo ✓", color: "#34d399" },
  cancelled: { label: "Cancelada", color: "var(--muted)" },
  completed: { label: "Concluída", color: "#60a5fa" },
  no_show: { label: "Não compareceu", color: "#f87171" },
  expired: { label: "Expirada (não paga)", color: "#f87171" },
};

const DURATIONS = [60, 120, 180, 240];
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MIN_ADVANCE_MS = 4 * 3600_000;

export function ReservasPage() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<"avulsa" | "recorrente">("avulsa");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [now, setNow] = useState(new Date());

  // avulsa/grupo form
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [stationCount, setStationCount] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // recorrente form
  const [dow, setDow] = useState(2);
  const [recTime, setRecTime] = useState("");
  const [recDuration, setRecDuration] = useState(60);
  const [savingRec, setSavingRec] = useState(false);

  async function load() {
    if (!user) return;
    const [{ data: res }, { data: rec }] = await Promise.all([
      supabase.from("reservations").select("*").eq("customer_id", user.id).order("starts_at", { ascending: false }).limit(20),
      supabase.from("recurring_reservations").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setReservations((res as Reservation[]) ?? []);
    setPlans((rec as RecurringPlan[]) ?? []);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("my-reservations")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `customer_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "recurring_reservations", filter: `customer_id=eq.${user.id}` }, load)
      .subscribe();
    const tick = setInterval(() => setNow(new Date()), 15_000);
    return () => { supabase.removeChannel(ch); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function createAvulsa(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) { toast.error("Escolha data e horário"); return; }
    const starts = new Date(`${date}T${time}:00`);
    if (starts.getTime() < Date.now() + MIN_ADVANCE_MS) {
      toast.error("Reserve com pelo menos 4 horas de antecedência");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("create_reservation", {
      p_starts_at: starts.toISOString(),
      p_duration_min: duration,
      p_station_count: stationCount,
      p_note: note.trim() || null,
    });
    setSaving(false);
    if (error || !data?.ok) {
      const msg = data?.error === "outside business hours (ter-dom 10h-22h)"
        ? "Fora do horário de funcionamento (ter–dom, 10h–22h)"
        : data?.error === "not enough stations available"
        ? `Só há ${data.free} PC(s) livre(s) nesse horário`
        : "Erro ao criar reserva";
      toast.error(msg);
      return;
    }
    toast.success(`Reserva criada — ${formatCents(data.price_cents)}. Pague em até 1h para confirmar.`);
    setDate(""); setTime(""); setNote(""); setStationCount(1);
    load();
  }

  async function createRecorrente(e: React.FormEvent) {
    e.preventDefault();
    if (!recTime) { toast.error("Escolha o horário"); return; }
    setSavingRec(true);
    const thisMonth = new Date(); thisMonth.setDate(1);
    const { data, error } = await supabase.rpc("create_recurring_reservation", {
      p_day_of_week: dow,
      p_start_time: recTime,
      p_duration_min: recDuration,
      p_month: thisMonth.toISOString().slice(0, 10),
    });
    setSavingRec(false);
    if (error || !data?.ok) {
      const msg = data?.error === "no valid occurrences left this month (4h advance required)"
        ? "Não há mais ocorrências válidas este mês para esse dia/horário"
        : typeof data?.error === "string" && data.error.startsWith("no room on")
        ? `Sem vaga em ${new Date(data.conflict_date + "T12:00:00").toLocaleDateString("pt-BR")} — escolha outro dia/horário`
        : "Erro ao criar plano recorrente";
      toast.error(msg);
      return;
    }
    toast.success(`Plano criado — ${data.occurrence_count}x por ${formatCents(data.price_cents)}. Pague em até 1h.`);
    load();
  }

  async function payWithCredits(id: string, kind: "reservation" | "recurring") {
    const rpc = kind === "reservation" ? "pay_reservation_with_credits" : "pay_recurring_with_credits";
    const param = kind === "reservation" ? { p_reservation_id: id } : { p_recurring_id: id };
    const { data, error } = await supabase.rpc(rpc, param);
    if (error || !data?.ok) {
      const msg = data?.error === "insufficient credits" ? "Créditos insuficientes"
        : data?.error === "slot no longer available" ? "Vaga perdida — outro cliente pagou primeiro. Reserva expirada."
        : data?.error === "payment window expired" ? "Prazo de pagamento expirado"
        : "Erro ao pagar";
      toast.error(msg);
      return;
    }
    toast.success("Pago com créditos! Reserva confirmada.");
    load();
  }

  async function cancel(r: Reservation) {
    const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", r.id);
    if (error) { toast.error("Erro ao cancelar"); return; }
    toast.success("Reserva cancelada");
    load();
  }

  function minutesLeft(deadline: string | null): number {
    if (!deadline) return 0;
    return Math.max(0, Math.round((new Date(deadline).getTime() - now.getTime()) / 60_000));
  }

  return (
    <div className="min-h-screen px-5 py-6 max-w-md mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/home" className="text-[--muted] text-sm">←</Link>
        <h1 className="text-lg font-black text-[--text]">Reservas</h1>
      </div>

      <Link to="/disponibilidade" className="block rounded-xl p-3 mb-6 text-center text-xs font-bold"
        style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa" }}>
        📊 Ver horários livres e PCs ocupados agora
      </Link>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--surface)" }}>
        {(["avulsa", "recorrente"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors"
            style={{ background: mode === m ? "var(--amber)" : "transparent", color: mode === m ? "#09090f" : "var(--muted)" }}>
            {m === "avulsa" ? "Avulsa / Grupo" : "Mensal (dia fixo)"}
          </button>
        ))}
      </div>

      {mode === "avulsa" ? (
        <form onSubmit={createAvulsa} className="rounded-xl p-4 mb-6 flex flex-col gap-3"
          style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Nova reserva</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input type="date" value={date} min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Horário">
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Duração">
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <ToggleBtn key={d} active={duration === d} onClick={() => setDuration(d)}>{d / 60}h</ToggleBtn>
              ))}
            </div>
          </Field>
          <Field label={`Quantos PCs? ${stationCount >= 5 ? "(reserva em grupo)" : ""}`}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStationCount(Math.max(1, stationCount - 1))} className={stepBtnCls}>−</button>
              <span className="text-lg font-black text-[--text] w-8 text-center">{stationCount}</span>
              <button type="button" onClick={() => setStationCount(Math.min(10, stationCount + 1))} className={stepBtnCls}>+</button>
            </div>
          </Field>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação (opcional)" className={inputCls} />
          <button type="submit" disabled={saving} className={submitCls} style={{ background: "var(--amber)", color: "#09090f" }}>
            {saving ? "Enviando…" : "Reservar"}
          </button>
          <p className="text-[10px] text-[--muted]">
            Antecedência mínima de 4h · ter–dom, 10h–22h · pagamento em até 1h após reservar
          </p>
        </form>
      ) : (
        <form onSubmit={createRecorrente} className="rounded-xl p-4 mb-6 flex flex-col gap-3"
          style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Plano do mês — mesmo dia toda semana</p>
          <Field label="Dia da semana">
            <div className="grid grid-cols-3 gap-2">
              {WEEKDAYS.map((w, i) => i === 1 ? null : (
                <ToggleBtn key={i} active={dow === i} onClick={() => setDow(i)}>{w.slice(0, 3)}</ToggleBtn>
              ))}
            </div>
          </Field>
          <Field label="Horário">
            <input type="time" value={recTime} onChange={(e) => setRecTime(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Duração por sessão">
            <div className="grid grid-cols-3 gap-2">
              {[60, 120, 180].map((d) => (
                <ToggleBtn key={d} active={recDuration === d} onClick={() => setRecDuration(d)}>{d / 60}h</ToggleBtn>
              ))}
            </div>
          </Field>
          <button type="submit" disabled={savingRec} className={submitCls} style={{ background: "var(--amber)", color: "#09090f" }}>
            {savingRec ? "Calculando…" : "Criar plano do mês"}
          </button>
          <p className="text-[10px] text-[--muted]">
            3h/sessão = preço do Pacote 3h ({profile?.is_founding_member ? "R$39,90" : "R$49,90"}) fixo pro mês todo · menos que isso, cobra por hora avulsa a cada sessão
          </p>
        </form>
      )}

      {/* Recurring plans */}
      {plans.length > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Planos mensais</p>
          {plans.map((p) => {
            const meta = STATUS_LABELS[p.status];
            const left = minutesLeft(p.payment_deadline_at);
            return (
              <div key={p.id} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[--text]">
                      {WEEKDAYS[p.day_of_week]} · {p.start_time.slice(0, 5)} · {p.duration_min / 60}h · {p.occurrence_count}x
                    </p>
                    <p className="text-xs" style={{ color: meta.color }}>{meta.label} · {formatCents(p.price_cents)}</p>
                  </div>
                </div>
                {p.status === "awaiting_payment" && left > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] text-[--muted]">{left}min para pagar</span>
                    <button onClick={() => payWithCredits(p.id, "recurring")}
                      className="ml-auto text-xs px-3 py-1.5 rounded font-bold" style={{ background: "var(--amber)", color: "#09090f" }}>
                      Pagar com créditos
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* One-off reservations */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Minhas reservas</p>
        {reservations.map((r) => {
          const meta = STATUS_LABELS[r.status];
          const dt = new Date(r.starts_at);
          const left = minutesLeft(r.payment_deadline_at);
          const cancellable = r.status === "confirmed" && dt.getTime() > Date.now();
          return (
            <div key={r.id} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[--text]">
                    {dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} · {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {r.station_count > 1 && <span className="ml-1.5 text-[10px]" style={{ color: "var(--amber)" }}>· {r.station_count} PCs{r.station_count >= 5 ? " (grupo)" : ""}</span>}
                  </p>
                  <p className="text-xs" style={{ color: meta.color }}>{meta.label} · {formatCents(r.price_cents)}</p>
                </div>
                {cancellable && <button onClick={() => cancel(r)} className="text-xs text-[--muted] underline">Cancelar</button>}
              </div>
              {r.status === "awaiting_payment" && left > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-[--muted]">{left}min para pagar</span>
                  <button onClick={() => payWithCredits(r.id, "reservation")}
                    className="ml-auto text-xs px-3 py-1.5 rounded font-bold" style={{ background: "var(--amber)", color: "#09090f" }}>
                    Pagar com créditos
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {reservations.length === 0 && <p className="text-xs text-[--muted] text-center py-4">Você ainda não tem reservas</p>}
      </div>
    </div>
  );
}

const inputCls = "px-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] placeholder:text-[--dim] focus:outline-none focus:border-[--amber]";
const stepBtnCls = "w-8 h-8 rounded font-bold text-[--text] bg-[--bg] border border-[--dim]";
const submitCls = "w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-[--muted] uppercase">{label}</label>
      {children}
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="py-2 rounded-lg text-xs font-bold"
      style={{
        background: active ? "var(--amber)" : "var(--bg)",
        color: active ? "#09090f" : "var(--text)",
        border: `1px solid ${active ? "var(--amber)" : "var(--dim)"}`,
      }}>
      {children}
    </button>
  );
}
