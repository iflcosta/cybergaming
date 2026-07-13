import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  PAYMENT_METHOD_LABELS, PACKAGES, formatCents, formatDuration,
  computeOpenBillingPreview,
  type Session, type PaymentMethod,
} from "@/lib/types";
import { usePackages } from "@/lib/packages";

interface Props {
  session: Session;
  onClose: () => void;
  onSuccess: () => void;
}

export function EndSessionModal({ session, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  const isOpen    = session.package_type === null;
  const isAvulso  = !session.customer_id;
  const needsMethod = isOpen || isAvulso;

  // Tick every 10 s for live preview
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, [isOpen]);

  const packages = usePackages();
  const preview = isOpen
    ? computeOpenBillingPreview(new Date(session.started_at), now, {
        vale_cents: packages.hora_vale.price_cents,
        pico_cents: packages.hora_pico.price_cents,
      })
    : null;

  const displayCents = isOpen ? (preview?.totalCents ?? 0) : session.price_cents;
  const elapsed = Math.round((now.getTime() - new Date(session.started_at).getTime()) / 60_000);

  async function handleEnd() {
    if (needsMethod && !method) return;
    setLoading(true);

    if (isOpen) {
      const { data, error } = await supabase.rpc("close_open_session", {
        p_session_id:     session.id,
        p_payment_method: method,
        p_ended_at:       new Date().toISOString(),
      });
      if (error || !data?.ok) {
        toast.error("Erro ao encerrar sessão");
        setLoading(false);
        return;
      }
      toast.success(`Sessão encerrada — ${session.station?.label ?? "PC"} · ${formatCents(data.total_cents)}`);
      onSuccess();
      return;
    }

    // Fixed package — atomic close (creates avulso transaction inside the RPC)
    const { data, error } = await supabase.rpc("close_fixed_session", {
      p_session_id:     session.id,
      p_payment_method: method,
      p_ended_at:       new Date().toISOString(),
    });

    if (error || !data?.ok) {
      toast.error("Erro ao encerrar sessão");
      setLoading(false);
      return;
    }

    toast.success(`Sessão encerrada — ${session.station?.label ?? "PC"}`);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--dim)" }}>
          <h2 className="font-bold text-white">Encerrar Sessão</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5">
          <div className="rounded-lg p-4 mb-5 flex flex-col gap-2.5" style={{ background: "var(--bg)", border: "1px solid var(--dim)" }}>
            <Row label="PC"      value={session.station?.label ?? "—"} />
            <Row label="Cliente" value={session.customer?.full_name ?? session.customer?.email ?? "Avulso"} />
            <Row label="Pacote"  value={isOpen ? "Sessão Aberta" : (PACKAGES[session.package_type!]?.label ?? "—")} />
            <Row label="Duração" value={`${elapsed}min`} />

            {/* Open session: live billing breakdown */}
            {isOpen && preview && preview.segments.length > 0 && (
              <div className="flex flex-col gap-1 pt-1">
                {preview.segments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {seg.rate_type === "hora_vale" ? "Hora Vale" : "Hora Pico"} · {formatDuration(seg.minutes)}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatCents(seg.amount_cents)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-2.5 flex items-center justify-between" style={{ borderColor: "var(--dim)" }}>
              <span className="text-xs text-slate-400">Total</span>
              <div className="text-right">
                <span className="text-xl font-black" style={{ color: "var(--amber)" }}>{formatCents(displayCents)}</span>
                {isOpen && <p className="text-[10px] text-slate-600">atualizado a cada 10s</p>}
              </div>
            </div>
          </div>

          {needsMethod && (
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
          )}

          {!needsMethod && (
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
