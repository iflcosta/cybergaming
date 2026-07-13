import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/billing";

interface CreditTx {
  id: string;
  amount_cents: number;
  status: "pending" | "paid" | "failed" | "refunded";
  created_at: string;
}

const AMOUNTS = [1000, 2000, 5000, 10000];
const MIN_CENTS = 500;
const MAX_CENTS = 50000;

export function CreditosPage() {
  const { user, profile } = useAuth();
  const [history, setHistory] = useState<CreditTx[]>([]);
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);

  function onCustomChange(v: string) {
    setCustomValue(v);
    const cents = Math.round(parseFloat(v.replace(",", ".")) * 100);
    setAmount(Number.isFinite(cents) && cents >= MIN_CENTS && cents <= MAX_CENTS ? cents : null);
  }

  function selectPreset(a: number) {
    setCustom(false);
    setCustomValue("");
    setAmount(a);
  }

  function selectCustom() {
    setCustom(true);
    setAmount(null);
  }

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("id, amount_cents, status, created_at")
      .eq("customer_id", user.id)
      .eq("type", "credit_purchase")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((data as CreditTx[]) ?? []);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("my-credits")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `customer_id=eq.${user.id}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function request() {
    if (!amount) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("request_credit_purchase", { p_amount_cents: amount });
    setSaving(false);
    if (error || !data?.ok) { toast.error("Erro ao solicitar créditos"); return; }
    toast.success("Pedido criado! Pague no caixa para liberar os créditos.");
    setAmount(null);
    load();
  }

  async function payOnline() {
    if (!amount) return;
    setPayingOnline(true);
    const { data, error } = await supabase.functions.invoke("asaas-create-charge", {
      body: { amount_cents: amount },
    });
    setPayingOnline(false);

    if (error || !data?.ok) {
      const msg = data?.error === "cpf_required"
        ? "Precisamos do seu CPF pra gerar a cobrança — complete seu perfil"
        : data?.error?.includes?.("não configurado")
        ? "Pagamento online ainda não está disponível — peça pra pagar no caixa"
        : "Erro ao gerar cobrança";
      toast.error(msg);
      return;
    }

    window.open(data.invoice_url, "_blank");
    toast.success("Cobrança gerada! Finalize o pagamento na aba que abriu.");
    setAmount(null);
    setCustom(false);
    setCustomValue("");
    load();
  }

  const pending = history.filter((h) => h.status === "pending");

  return (
    <div className="min-h-screen px-5 py-6 max-w-md mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/home" className="text-[--muted] text-sm">←</Link>
        <h1 className="text-lg font-black text-[--text]">Créditos</h1>
      </div>

      {/* Balance */}
      <div className="rounded-xl p-4 mb-6 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <p className="text-xs text-[--muted] uppercase tracking-wider mb-1">Saldo atual</p>
        <p className="text-3xl font-black" style={{ color: "var(--amber)" }}>
          {formatCents(profile?.credits_balance ?? 0)}
        </p>
      </div>

      {/* Buy */}
      <div className="rounded-xl p-4 mb-6 flex flex-col gap-3"
        style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Adicionar créditos</p>
        <div className="grid grid-cols-3 gap-2">
          {AMOUNTS.map((a) => (
            <button key={a} onClick={() => selectPreset(a)}
              className="py-2.5 rounded-lg text-sm font-bold"
              style={{
                background: !custom && amount === a ? "var(--amber)" : "var(--bg)",
                color: !custom && amount === a ? "#09090f" : "var(--text)",
                border: `1px solid ${!custom && amount === a ? "var(--amber)" : "var(--dim)"}`,
              }}>
              {formatCents(a).replace(",00", "")}
            </button>
          ))}
          <button onClick={selectCustom}
            className="py-2.5 rounded-lg text-sm font-bold"
            style={{
              background: custom ? "var(--amber)" : "var(--bg)",
              color: custom ? "#09090f" : "var(--text)",
              border: `1px solid ${custom ? "var(--amber)" : "var(--dim)"}`,
            }}>
            Personalizado
          </button>
        </div>
        {custom && (
          <div className="flex flex-col gap-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[--muted]">R$</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={customValue}
                onChange={(e) => onCustomChange(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-[--bg] border border-[--dim] text-[--text] placeholder:text-[--dim] focus:outline-none focus:border-[--amber]"
              />
            </div>
            <p className="text-[10px] text-[--muted]">Entre R$5,00 e R$500,00</p>
          </div>
        )}
        <button onClick={payOnline} disabled={!amount || payingOnline || saving}
          className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50"
          style={{ background: "var(--amber)", color: "#09090f" }}>
          {payingOnline ? "Gerando cobrança…" : "Pagar agora — PIX/Cartão"}
        </button>
        <button onClick={request} disabled={!amount || saving || payingOnline}
          className="w-full py-2.5 rounded-lg font-semibold text-xs uppercase tracking-wider disabled:opacity-50"
          style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--dim)" }}>
          {saving ? "Solicitando…" : "Prefiro pagar no caixa"}
        </button>
        <p className="text-[10px] text-[--muted]">
          Pagamento online é liberado na hora. No caixa, aguarda confirmação do staff.
        </p>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl p-4 mb-6"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.4)" }}>
          <p className="text-xs font-bold" style={{ color: "var(--amber)" }}>
            {pending.length === 1
              ? `Pedido de ${formatCents(pending[0].amount_cents)} aguardando pagamento no caixa`
              : `${pending.length} pedidos aguardando pagamento no caixa`}
          </p>
        </div>
      )}

      {/* History */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Histórico</p>
        {history.map((h) => (
          <div key={h.id} className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
            <div>
              <p className="text-sm font-bold text-[--text]">{formatCents(h.amount_cents)}</p>
              <p className="text-[10px] text-[--muted]">
                {new Date(h.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <span className="text-[10px] font-bold"
              style={{ color: h.status === "paid" ? "#34d399" : h.status === "pending" ? "var(--amber)" : "#f87171" }}>
              {h.status === "paid" ? "CREDITADO" : h.status === "pending" ? "PENDENTE" : "CANCELADO"}
            </span>
          </div>
        ))}
        {history.length === 0 && <p className="text-xs text-[--muted] text-center py-3">Nenhuma compra ainda</p>}
      </div>
    </div>
  );
}
