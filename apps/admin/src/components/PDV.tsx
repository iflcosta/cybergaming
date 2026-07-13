import { useEffect, useRef, useState } from "react";
import { X, Search, Check, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  type PcStation, type Profile, type PackageType, type PaymentMethod,
  PAYMENT_METHOD_LABELS, FIXED_PACKAGE_TYPES, formatCents, formatDuration,
} from "@/lib/types";
import { usePackages, type PackageInfo } from "@/lib/packages";

interface Props {
  stations: PcStation[];
  onClose: () => void;
  onSuccess: () => void;
  preselectedStation?: PcStation;
}

const STEPS = ["station", "customer", "package", "payment", "confirm"] as const;
type Step = typeof STEPS[number];

export function PDV({ stations, onClose, onSuccess, preselectedStation }: Props) {
  const [step, setStep] = useState<Step>(preselectedStation ? "customer" : "station");
  const [station, setStation] = useState<PcStation | null>(preselectedStation ?? null);
  const [customer, setCustomer] = useState<Profile | null | "avulso">(null);
  const [pkg, setPkg] = useState<PackageType | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const packages = usePackages();
  const [discountPct, setDiscountPct] = useState(0);

  const customerId = customer !== "avulso" ? (customer as Profile | null)?.id ?? null : null;

  useEffect(() => {
    if (!customerId) { setDiscountPct(0); return; }
    supabase.rpc("get_customer_discount_pct", { p_customer_id: customerId }).then(({ data }) => {
      setDiscountPct(typeof data === "number" ? data : 0);
    });
  }, [customerId]);

  /** Price the selected customer actually pays for a package. */
  function effectivePrice(key: PackageType): number {
    const base = packages[key].price_cents;
    return discountPct > 0 ? Math.round(base * (100 - discountPct) / 100) : base;
  }

  function searchCustomers(q: string) {
    setSearch(q);
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      setSearchResults(data ?? []);
      setSearching(false);
    }, 300);
  }

  async function confirm() {
    if (!station) return;
    const isOpen = pkg === null;
    const isAvulso = customer === "avulso";
    // Open session: no payment now; fixed package non-avulso: needs method
    if (!isOpen && !isAvulso && !method) return;

    setLoading(true);
    const now = new Date();
    let transactionId: string | null = null;
    let priceCents = 0;
    let plannedEnd: Date | null = null;

    if (!isOpen) {
      const pkgInfo = packages[pkg!];
      priceCents  = effectivePrice(pkg!);
      plannedEnd  = new Date(now.getTime() + pkgInfo.duration_min * 60_000);

      // Corujão ends at 06:00 BRT, regardless of start time
      if (pkg === "corujao") {
        const local = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const offsetMs = now.getTime() - local.getTime();
        const localEnd = new Date(local);
        if (local.getHours() >= 6) localEnd.setDate(localEnd.getDate() + 1);
        localEnd.setHours(6, 0, 0, 0);
        plannedEnd = new Date(localEnd.getTime() + offsetMs);
      }

      // Create upfront transaction only for registered customers paying now
      if (!isAvulso && customerId && method) {
        const { data: tx, error: txErr } = await supabase
          .from("transactions")
          .insert({
            customer_id: customerId,
            amount_cents: priceCents,
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
        transactionId = tx.id;

        // One-time inaugural voucher (25% off) is consumed on first use
        if (discountPct === 25) {
          await supabase.rpc("consume_founding_voucher", { p_customer_id: customerId });
        }
      }
    }

    const { error: sessErr } = await supabase.from("sessions").insert({
      customer_id: customerId,
      station_id: station.id,
      package_type: pkg,
      planned_end_at: plannedEnd?.toISOString() ?? null,
      status: "active",
      price_cents: priceCents,
      transaction_id: transactionId,
    });

    if (sessErr) {
      toast.error("Erro ao abrir sessão");
      setLoading(false);
      return;
    }

    const label = isAvulso ? "Avulso" : (customer as Profile).full_name ?? (customer as Profile).email;
    toast.success(`Sessão aberta — ${station.label} · ${label}`);
    onSuccess();
  }

  const stepIndex = STEPS.indexOf(step);
  // Open session or avulso: skip payment (pay at end)
  const effectiveSteps = (customer === "avulso" || pkg === null)
    ? STEPS.filter((s) => s !== "payment")
    : STEPS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--dim)" }}>
          <div>
            <h2 className="font-bold text-white">PDV — Nova Sessão</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              {effectiveSteps.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: step === s ? "var(--amber)" : stepIndex > STEPS.indexOf(s) ? "#22c55e" : "var(--dim)",
                      color: step === s || stepIndex > STEPS.indexOf(s) ? "#09090f" : "var(--muted)",
                    }}
                  >
                    {stepIndex > STEPS.indexOf(s) ? <Check size={10} /> : i + 1}
                  </div>
                  {i < effectiveSteps.length - 1 && <div className="w-3 h-px" style={{ background: "var(--dim)" }} />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Step: Select station */}
          {step === "station" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Selecione o PC</p>
              <div className="grid grid-cols-5 gap-2">
                {stations.map((s) => (
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

          {/* Step: Customer */}
          {step === "customer" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                PC {station?.station_number} — Cliente
              </p>

              {/* Avulso option */}
              <button
                onClick={() => { setCustomer("avulso"); setStep("package"); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-4 transition-colors hover:bg-white/5"
                style={{ border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.06)" }}
              >
                <UserX size={16} style={{ color: "var(--amber)" }} />
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: "var(--amber)" }}>Avulso — sem cadastro</p>
                  <p className="text-xs text-slate-500">Paga ao encerrar a sessão</p>
                </div>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: "var(--dim)" }} />
                <span className="text-xs text-slate-600">ou buscar cliente</span>
                <div className="flex-1 h-px" style={{ background: "var(--dim)" }} />
              </div>

              <div className="relative mb-3">
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
              {searching && <p className="text-xs text-slate-500 text-center py-3">Buscando…</p>}
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
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
                    <p className="text-xs font-bold" style={{ color: "var(--amber)" }}>
                      {formatCents(c.credits_balance)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Package */}
          {step === "package" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {customer === "avulso" ? "Avulso" : (customer as Profile)?.full_name ?? (customer as Profile)?.email} — Pacote
              </p>
              {/* Open session tile */}
              <button
                onClick={() => { setPkg(null); setStep("confirm"); }}
                className="w-full p-4 rounded-lg text-left mb-3 transition-all hover:scale-[1.01]"
                style={{ background: "rgba(251,191,36,0.06)", border: `1px solid ${pkg === null ? "var(--amber)" : "rgba(251,191,36,0.3)"}` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--amber)" }}>Sessão Aberta</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cobra por tempo real · Hora Vale {formatCents(packages.hora_vale.price_cents)}/h · Hora Pico {formatCents(packages.hora_pico.price_cents)}/h
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">paga ao encerrar</p>
                </div>
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px" style={{ background: "var(--dim)" }} />
                <span className="text-xs text-slate-600">ou pacote fixo</span>
                <div className="flex-1 h-px" style={{ background: "var(--dim)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {FIXED_PACKAGE_TYPES.map((key) => {
                  const p = packages[key];
                  const discounted = discountPct > 0;
                  return (
                    <button
                      key={key}
                      onClick={() => { setPkg(key); setStep(customer === "avulso" ? "confirm" : "payment"); }}
                      className="p-4 rounded-lg text-left transition-all hover:scale-[1.02]"
                      style={{ background: "var(--bg)", border: `1px solid ${pkg === key ? "var(--amber)" : "var(--dim)"}` }}
                    >
                      <p className="text-xs text-slate-400 mb-1">{p.label}</p>
                      {discounted ? (
                        <>
                          <p className="text-xl font-black" style={{ color: "var(--amber)" }}>{formatCents(effectivePrice(key))}</p>
                          <p className="text-[10px] text-slate-500 line-through">{formatCents(p.price_cents)}</p>
                          <p className="text-[10px] font-bold" style={{ color: "var(--amber)" }}>
                            ★ {discountPct === 25 ? "Voucher inaugural −25%" : "Founding −10%"}
                          </p>
                        </>
                      ) : (
                        <p className="text-xl font-black text-white">{formatCents(p.price_cents)}</p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">{p.detail}</p>
                      <p className="text-[10px] text-slate-600">{formatDuration(p.duration_min)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Payment (only for registered customers) */}
          {step === "payment" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {pkg && packages[pkg].label} — Pagamento
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
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && station && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Confirmar sessão</p>
              <div className="rounded-lg p-4 mb-6 flex flex-col gap-3" style={{ background: "var(--bg)", border: "1px solid var(--dim)" }}>
                <Row label="PC" value={station.label ?? `PC-${station.station_number}`} />
                <Row
                  label="Cliente"
                  value={customer === "avulso" ? "Avulso" : (customer as Profile)?.full_name ?? (customer as Profile)?.email ?? "—"}
                />
                <Row label="Pacote" value={pkg ? packages[pkg].label : "Sessão Aberta"} />
                {pkg && <Row label="Duração" value={formatDuration(packages[pkg].duration_min)} />}
                {customer !== "avulso" && method && (
                  <Row label="Pagamento" value={PAYMENT_METHOD_LABELS[method]} />
                )}
                <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: "var(--dim)" }}>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Total</span>
                  <div className="text-right">
                    {pkg ? (
                      <>
                        <span className="text-xl font-black" style={{ color: "var(--amber)" }}>
                          {formatCents(effectivePrice(pkg))}
                        </span>
                        {discountPct > 0 && (
                          <p className="text-[10px] font-bold" style={{ color: "var(--amber)" }}>
                            ★ {discountPct === 25 ? "Voucher inaugural −25%" : "Founding −10%"}
                          </p>
                        )}
                      </>
                    ) : (
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--amber)" }}>por tempo usado</p>
                        <p className="text-[10px] text-slate-500">
                          {formatCents(packages.hora_vale.price_cents)}/h vale · {formatCents(packages.hora_pico.price_cents)}/h pico
                        </p>
                      </div>
                    )}
                    {(customer === "avulso" || pkg === null) && pkg && (
                      <p className="text-[10px] text-slate-500">cobrar ao encerrar</p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={confirm}
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                style={{ background: "var(--amber)", color: "#09090f" }}
              >
                {loading ? "Abrindo…" : "Abrir Sessão"}
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
