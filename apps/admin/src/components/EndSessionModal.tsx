import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PAYMENT_METHOD_LABELS, PACKAGES, formatCents, type Session, type PaymentMethod } from "@/lib/types";

interface Props {
  session: Session;
  onClose: () => void;
  onSuccess: () => void;
}

export function EndSessionModal({ session, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const isAvulso = !session.customer_id;

  async function handleEnd() {
    if (isAvulso && !method) return;
    setLoading(true);

    if (isAvulso && method) {
      const { error: txErr } = await supabase.from("transactions").insert({
        customer_id: null,
        amount_cents: session.price_cents,
        type: "purchase",
        payment_method: method,
        status: "paid",
        description: `${PACKAGES[session.package_type]?.label ?? session.package_type} — ${session.station?.label ?? "PC"} (avulso)`,
      });
      if (txErr) {
        toast.error("Erro ao registrar pagamento");
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase
      .from("sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", session.id);

    if (error) {
      toast.error("Erro ao encerrar sessão");
      setLoading(false);
      return;
    }

    toast.success(`Sessão encerrada — ${session.station?.label ?? "PC"}`);
    onSuccess();
  }

  const elapsed = Math.round((Date.now() - new Date(session.started_at).getTime()) / 60_000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--dim)" }}>
          <h2 className="font-bold text-white">Encerrar Sessão</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5">
          <div className="rounded-lg p-4 mb-5 flex flex-col gap-2.5" style={{ background: "var(--bg)", border: "1px solid var(--dim)" }}>
            <Row label="PC" value={session.station?.label ?? "—"} />
            <Row label="Cliente" value={session.customer?.full_name ?? session.customer?.email ?? "Avulso"} />
            <Row label="Pacote" value={PACKAGES[session.package_type]?.label ?? session.package_type} />
            <Row label="Duração" value={`${elapsed}min`} />
            <div className="border-t pt-2.5 flex items-center justify-between" style={{ borderColor: "var(--dim)" }}>
              <span className="text-xs text-slate-400">Total</span>
              <span className="text-xl font-black" style={{ color: "var(--amber)" }}>{formatCents(session.price_cents)}</span>
            </div>
          </div>

          {isAvulso ? (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Forma de pagamento</p>
              <div className="flex flex-col gap-2 mb-5">
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][])
                  .filter(([k]) => k !== "credits")
                  .map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setMethod(key)}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors hover:bg-white/5"
                      style={{ border: `1px solid ${method === key ? "var(--amber)" : "var(--dim)"}`, color: method === key ? "var(--amber)" : "var(--text)" }}
                    >
                      {label}
                    </button>
                  ))}
              </div>
              <button
                onClick={handleEnd}
                disabled={!method || loading}
                className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                style={{ background: "var(--amber)", color: "#09090f" }}
              >
                {loading ? "Encerrando…" : "Confirmar Pagamento e Encerrar"}
              </button>
            </>
          ) : (
            <button
              onClick={handleEnd}
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              {loading ? "Encerrando…" : "Encerrar Sessão"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
