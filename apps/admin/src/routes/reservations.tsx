import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatCents, formatDuration, PAYMENT_METHOD_LABELS, type Profile, type PcStation, type PaymentMethod } from "@/lib/types";

type ReservationStatus = "awaiting_payment" | "confirmed" | "cancelled" | "completed" | "no_show" | "expired";

interface Reservation {
  id: string;
  customer_id: string;
  starts_at: string;
  duration_min: number;
  station_count: number;
  assigned_station_ids: string[];
  status: ReservationStatus;
  note: string | null;
  price_cents: number;
  payment_deadline_at: string | null;
  is_recurring: boolean;
  created_at: string;
  customer?: Profile;
}

const STATUS_META: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  awaiting_payment: { label: "AGUARD. PAGAMENTO", color: "var(--amber)", bg: "rgba(251,191,36,0.15)" },
  confirmed: { label: "CONFIRMADA", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  cancelled: { label: "CANCELADA", color: "var(--muted)", bg: "rgba(100,116,139,0.15)" },
  completed: { label: "CONCLUÍDA", color: "#60a5fa", bg: "rgba(96,165,250,0.15)" },
  no_show: { label: "NÃO VEIO", color: "#f87171", bg: "rgba(239,68,68,0.15)" },
  expired: { label: "EXPIRADA", color: "#f87171", bg: "rgba(239,68,68,0.1)" },
};

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stations, setStations] = useState<PcStation[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: res }, { data: pcs }] = await Promise.all([
      supabase
        .from("reservations")
        .select("*, customer:profiles(*)")
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

  async function confirmPayment(r: Reservation, method: PaymentMethod) {
    const { data, error } = await supabase.rpc("confirm_reservation_payment", {
      p_reservation_id: r.id,
      p_payment_method: method,
    });
    if (error || !data?.ok) { toast.error("Erro ao confirmar pagamento"); return; }
    toast.success("Pagamento confirmado — reserva efetivada");
  }

  async function assignStations(r: Reservation, ids: string[]) {
    const { error } = await supabase.from("reservations").update({ assigned_station_ids: ids }).eq("id", r.id);
    if (error) { toast.error("Erro ao atribuir PCs"); return; }
    toast.success("PCs atribuídos");
  }

  async function setStatus(r: Reservation, status: ReservationStatus) {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", r.id);
    if (error) { toast.error("Erro ao atualizar reserva"); return; }
    toast.success(`Reserva ${STATUS_META[status].label.toLowerCase()}`);
  }

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  const awaitingPayment = reservations.filter((r) => r.status === "awaiting_payment");
  const upcoming = reservations.filter((r) => r.status === "confirmed");
  const past = reservations.filter((r) => !["awaiting_payment", "confirmed"].includes(r.status));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Reservas</h1>
        <p className="text-sm text-slate-500 mt-0.5">{awaitingPayment.length} aguardando pagamento · {upcoming.length} confirmadas</p>
      </div>

      {reservations.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <CalendarClock className="mx-auto mb-2 text-slate-600" size={24} />
          <p className="text-slate-500 text-sm">Nenhuma reserva</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...awaitingPayment, ...upcoming, ...past].map((r) => {
            const meta = STATUS_META[r.status];
            const dt = new Date(r.starts_at);
            const isGroup = r.station_count >= 5;
            return (
              <div key={r.id} className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-[90px]">
                    <p className="text-sm font-black text-white">
                      {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </p>
                    <p className="text-xs" style={{ color: "var(--amber)" }}>
                      {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {formatDuration(r.duration_min)}
                    </p>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-semibold text-white">
                      {r.customer?.full_name ?? r.customer?.email ?? "—"}
                      {r.is_recurring && <span className="ml-1.5 text-[10px]" style={{ color: "#60a5fa" }}>· mensal</span>}
                      {isGroup && <span className="ml-1.5 text-[10px]" style={{ color: "var(--amber)" }}>· grupo ({r.station_count} PCs)</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatCents(r.price_cents)}{r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                  {r.status === "confirmed" && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setStatus(r, "completed")} className="text-xs px-2.5 py-1 rounded" style={{ color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}>
                        Compareceu
                      </button>
                      <button onClick={() => setStatus(r, "no_show")} className="text-xs px-2.5 py-1 rounded" style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                        Não veio
                      </button>
                      <button onClick={() => setStatus(r, "cancelled")} className="text-xs px-2.5 py-1 rounded text-slate-500" style={{ border: "1px solid var(--dim)" }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {r.status === "awaiting_payment" && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--dim)" }}>
                    <span className="text-[10px] text-slate-500">Pagamento recebido no caixa:</span>
                    {(["pix", "cash", "credit_card", "debit_card"] as PaymentMethod[]).map((m) => (
                      <button key={m} onClick={() => confirmPayment(r, m)}
                        className="text-xs px-2.5 py-1 rounded font-bold" style={{ background: "var(--amber)", color: "#09090f" }}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </button>
                    ))}
                  </div>
                )}

                {r.status === "confirmed" && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--dim)" }}>
                    <span className="text-[10px] text-slate-500">PC(s) ({r.assigned_station_ids.length}/{r.station_count}):</span>
                    {stations.filter((s) => s.is_active).map((s) => {
                      const assigned = r.assigned_station_ids.includes(s.id);
                      return (
                        <button key={s.id}
                          onClick={() => assignStations(r, assigned
                            ? r.assigned_station_ids.filter((id) => id !== s.id)
                            : [...r.assigned_station_ids, s.id])}
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            background: assigned ? "rgba(52,211,153,0.15)" : "var(--bg)",
                            color: assigned ? "#34d399" : "var(--muted)",
                            border: `1px solid ${assigned ? "rgba(52,211,153,0.4)" : "var(--dim)"}`,
                          }}>
                          {s.label ?? `PC-${s.station_number}`}
                        </button>
                      );
                    })}
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
