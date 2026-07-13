import { useState } from "react";
import { X, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  type PcStation, type Profile, type PackageType, type PaymentMethod,
  PACKAGES, PAYMENT_METHOD_LABELS, formatCents,
} from "@/lib/types";

interface Props {
  stations: PcStation[];
  onClose: () => void;
  onSuccess: () => void;
  preselectedStation?: PcStation;
}

export function PDV({ stations, onClose, onSuccess, preselectedStation }: Props) {
  const [step, setStep] = useState<"station" | "customer" | "package" | "payment" | "confirm">(
    preselectedStation ? "customer" : "station"
  );
  const [station, setStation] = useState<PcStation | null>(preselectedStation ?? null);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [pkg, setPkg] = useState<PackageType | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  async function searchCustomers(q: string) {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8);
    setSearchResults(data ?? []);
    setSearching(false);
  }

  async function confirm() {
    if (!station || !customer || !pkg || !method) return;
    setLoading(true);
    const pkgInfo = PACKAGES[pkg];
    const now = new Date();
    const plannedEnd = new Date(now.getTime() + pkgInfo.duration_min * 60_000);

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        customer_id: customer.id,
        amount_cents: pkgInfo.price_cents,
        type: "purchase",
        payment_method: method,
        status: "paid",
        description: `${pkgInfo.label} — ${station.label}`,
      })
      .select()
      .single();

    if (txErr || !tx) {
      toast.error("Erro ao registrar pagamento");
      setLoading(false);
      return;
    }

    const { error: sessErr } = await supabase.from("sessions").insert({
      customer_id: customer.id,
      station_id: station.id,
      package_type: pkg,
      planned_end_at: plannedEnd.toISOString(),
      status: "active",
      price_cents: pkgInfo.price_cents,
      transaction_id: tx.id,
    });

    if (sessErr) {
      toast.error("Erro ao abrir sessão");
      setLoading(false);
      return;
    }

    toast.success(`Sessão aberta — ${station.label} para ${customer.full_name ?? customer.email}`);
    onSuccess();
  }

  const freeStations = stations.filter((s) => s.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--dim)" }}>
          <div>
            <h2 className="font-bold text-white">PDV — Nova Sessão</h2>
            <div className="flex items-center gap-2 mt-1">
              {(["station", "customer", "package", "payment", "confirm"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: step === s ? "var(--amber)" : (
                        ["station", "customer", "package", "payment", "confirm"].indexOf(step) > i
                          ? "#22c55e" : "var(--dim)"
                      ),
                      color: step === s || ["station", "customer", "package", "payment", "confirm"].indexOf(step) > i
                        ? "#09090f" : "var(--muted)",
                    }}
                  >
                    {["station", "customer", "package", "payment", "confirm"].indexOf(step) > i ? <Check size={10} /> : i + 1}
                  </div>
                  {i < 4 && <div className="w-4 h-px" style={{ background: "var(--dim)" }} />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Select station */}
          {step === "station" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Selecione o PC</p>
              <div className="grid grid-cols-5 gap-2">
                {freeStations.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setStation(s); setStep("customer"); }}
                    className="py-3 rounded-lg font-bold text-sm transition-all hover:scale-105"
                    style={{ background: "var(--bg)", border: "1px solid var(--dim)", color: "var(--text)" }}
                  >
                    {s.station_number}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select customer */}
          {step === "customer" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                PC {station?.station_number} — Buscar cliente
              </p>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => searchCustomers(e.target.value)}
                  placeholder="Nome, telefone ou email…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--dim)" }}
                />
              </div>
              {searching && <p className="text-xs text-slate-500 text-center py-4">Buscando…</p>}
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomer(c); setStep("package"); }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/5"
                    style={{ border: "1px solid var(--dim)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{c.full_name ?? c.email}</p>
                      <p className="text-xs text-slate-500">{c.phone ?? c.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: "var(--amber)" }}>
                        {formatCents(c.credits_balance)}
                      </p>
                      {c.is_founding_member && (
                        <p className="text-[10px] text-yellow-500">★ Founding</p>
                      )}
                    </div>
                  </button>
                ))}
                {search.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhum cliente encontrado</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Select package */}
          {step === "package" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {customer?.full_name ?? customer?.email} — Selecione o pacote
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(PACKAGES) as [PackageType, typeof PACKAGES[PackageType]][]).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => { setPkg(key); setStep("payment"); }}
                    className="p-4 rounded-lg text-left transition-all hover:scale-[1.02]"
                    style={{ background: "var(--bg)", border: `1px solid ${pkg === key ? "var(--amber)" : "var(--dim)"}` }}
                  >
                    <p className="text-xs text-slate-400 mb-1">{p.label}</p>
                    <p className="text-xl font-black text-white">{formatCents(p.price_cents)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{p.detail}</p>
                    <p className="text-[10px] text-slate-600">{p.duration_min >= 60 ? `${p.duration_min / 60}h` : `${p.duration_min}min`}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Payment method */}
          {step === "payment" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {pkg && PACKAGES[pkg].label} — Forma de pagamento
              </p>
              <div className="flex flex-col gap-2">
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setMethod(key); setStep("confirm"); }}
                    className="flex items-center justify-between px-4 py-3 rounded-lg transition-colors hover:bg-white/5"
                    style={{ border: `1px solid ${method === key ? "var(--amber)" : "var(--dim)"}` }}
                  >
                    <span className="text-sm text-white font-medium">{label}</span>
                    {key === "credits" && customer && (
                      <span className="text-xs text-slate-500">
                        Saldo: {formatCents(customer.credits_balance)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === "confirm" && station && customer && pkg && method && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Confirmar sessão</p>
              <div className="rounded-lg p-4 mb-6 flex flex-col gap-3" style={{ background: "var(--bg)", border: "1px solid var(--dim)" }}>
                <Row label="PC" value={station.label ?? `PC-${station.station_number}`} />
                <Row label="Cliente" value={customer.full_name ?? customer.email} />
                <Row label="Pacote" value={PACKAGES[pkg].label} />
                <Row label="Duração" value={`${PACKAGES[pkg].duration_min >= 60 ? PACKAGES[pkg].duration_min / 60 + "h" : PACKAGES[pkg].duration_min + "min"}`} />
                <Row label="Pagamento" value={PAYMENT_METHOD_LABELS[method]} />
                <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: "var(--dim)" }}>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Total</span>
                  <span className="text-xl font-black" style={{ color: "var(--amber)" }}>
                    {formatCents(PACKAGES[pkg].price_cents)}
                  </span>
                </div>
              </div>
              <button
                onClick={confirm}
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                style={{ background: "var(--amber)", color: "#09090f" }}
              >
                {loading ? "Abrindo sessão…" : "Confirmar e Abrir Sessão"}
              </button>
            </div>
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
