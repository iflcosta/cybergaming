import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatCents, PAYMENT_METHOD_LABELS, type Transaction, type PaymentMethod } from "@/lib/types";

type Period = "today" | "7d" | "month";

interface Tx extends Transaction {
  is_off_hours: boolean;
  type: string;
}

interface Expense {
  id: string;
  description: string;
  amount_cents: number;
  incurred_on: string;
  category_id?: string | null;
}

interface RecurringCategory {
  id: string;
  label: string;
  default_amount_cents: number | null;
  sort_order: number;
}

function periodStart(p: Period): Date {
  const d = new Date();
  if (p === "today") { d.setHours(0, 0, 0, 0); return d; }
  if (p === "7d") { d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
  d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

export function TransactionsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [pendingCredits, setPendingCredits] = useState<Tx[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [split, setSplit] = useState({ normal_operator_pct: 50, off_operator_pct: 60 });
  const [expForm, setExpForm] = useState({ description: "", amount: "" });
  const [loading, setLoading] = useState(true);
  const [founding, setFounding] = useState({ total: 0, voucherUsed: 0, voucherPending: 0 });
  const [recurringCategories, setRecurringCategories] = useState<RecurringCategory[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [recurringInputs, setRecurringInputs] = useState<Record<string, string>>({});

  async function loadRecurring() {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [{ data: cats }, { data: exps }] = await Promise.all([
      supabase.from("recurring_expense_categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("expenses").select("*").not("category_id", "is", null).gte("incurred_on", monthStart.toISOString().slice(0, 10)),
    ]);
    setRecurringCategories((cats as RecurringCategory[]) ?? []);
    setMonthExpenses((exps as Expense[]) ?? []);
  }

  async function confirmRecurringExpense(cat: RecurringCategory) {
    const raw = recurringInputs[cat.id] ?? "";
    const cents = Math.round(parseFloat(raw.replace(",", ".")) * 100);
    if (isNaN(cents) || cents <= 0) { toast.error("Digite um valor válido"); return; }
    const { error } = await supabase.from("expenses").insert({
      description: cat.label, amount_cents: cents, category_id: cat.id,
    });
    if (error) { toast.error("Erro ao confirmar — já lançado esse mês?"); return; }
    setRecurringInputs((s) => ({ ...s, [cat.id]: "" }));
    loadRecurring();
    load();
  }

  async function load() {
    const start = periodStart(period).toISOString();
    const startDate = periodStart(period).toISOString().slice(0, 10);
    const [{ data: txs }, { data: pend }, { data: exps }, { data: cfg }, { count: fTotal }, { count: fUsed }, { count: fPending }] = await Promise.all([
      supabase.from("transactions")
        .select("*, customer:profiles(full_name, email)")
        .eq("status", "paid")
        .gte("created_at", start)
        .order("created_at", { ascending: false }),
      supabase.from("transactions")
        .select("*, customer:profiles(full_name, email)")
        .eq("type", "credit_purchase")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").gte("incurred_on", startDate).order("incurred_on", { ascending: false }),
      supabase.from("app_settings").select("value").eq("key", "partner_split").single(),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_founding_member", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_founding_member", true).eq("founding_discount_used", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_founding_member", true).eq("founding_discount_used", false),
    ]);
    setTransactions((txs as Tx[]) ?? []);
    setPendingCredits((pend as Tx[]) ?? []);
    setExpenses((exps as Expense[]) ?? []);
    if (cfg?.value) setSplit(cfg.value);
    setFounding({ total: fTotal ?? 0, voucherUsed: fUsed ?? 0, voucherPending: fPending ?? 0 });
    setLoading(false);
  }

  useEffect(() => {
    load();
    loadRecurring();
    const ch = supabase.channel("transactions-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function confirmCredit(tx: Tx, method: PaymentMethod) {
    const { data, error } = await supabase.rpc("confirm_credit_purchase", {
      p_transaction_id: tx.id,
      p_payment_method: method,
    });
    if (error || !data?.ok) { toast.error("Erro ao confirmar créditos"); return; }
    toast.success(`Créditos liberados — ${formatCents(data.amount_cents)}`);
    load();
  }

  async function addExpense() {
    const cents = Math.round(parseFloat(expForm.amount.replace(",", ".")) * 100);
    if (!expForm.description.trim() || isNaN(cents) || cents <= 0) { toast.error("Descrição e valor válidos"); return; }
    const { error } = await supabase.from("expenses").insert({ description: expForm.description.trim(), amount_cents: cents });
    if (error) { toast.error("Erro ao lançar despesa"); return; }
    setExpForm({ description: "", amount: "" });
    load();
  }

  async function removeExpense(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  const TYPE_LABELS: Record<string, string> = {
    purchase: "Sessões (pacote)",
    product_sale: "Produtos",
    reservation_payment: "Reservas",
    credit_purchase: "Créditos",
  };
  const byType = Object.entries(
    transactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.type] = (acc[t.type] ?? 0) + t.amount_cents;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const revenueNormal = transactions.filter((t) => !t.is_off_hours).reduce((a, t) => a + t.amount_cents, 0);
  const revenueOff = transactions.filter((t) => t.is_off_hours).reduce((a, t) => a + t.amount_cents, 0);
  const revenue = revenueNormal + revenueOff;
  const totalExpenses = expenses.reduce((a, e) => a + e.amount_cents, 0);
  const profit = revenue - totalExpenses;

  // Allocate expenses proportionally to each period's revenue share
  const profitNormal = revenue > 0 ? Math.round(profit * (revenueNormal / revenue)) : 0;
  const profitOff = profit - profitNormal;
  const operatorShare = Math.round(profitNormal * split.normal_operator_pct / 100)
                      + Math.round(profitOff * split.off_operator_pct / 100);
  const partnerShare = profit - operatorShare;

  const PERIODS: { key: Period; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "7d", label: "7 dias" },
    { key: "month", label: "Mês" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Financeiro</h1>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--surface)" }}>
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setLoading(true); }}
              className="px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: period === p.key ? "var(--amber)" : "transparent", color: period === p.key ? "#09090f" : "var(--muted)" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pending credit purchases */}
      {pendingCredits.length > 0 && (
        <div className="rounded-lg p-4 mb-6" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.35)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--amber)" }}>
            Créditos aguardando pagamento
          </p>
          <div className="flex flex-col gap-2">
            {pendingCredits.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-white flex-1">
                  {t.customer?.full_name ?? t.customer?.email ?? "—"} · <b style={{ color: "var(--amber)" }}>{formatCents(t.amount_cents)}</b>
                </span>
                {(["pix", "cash", "credit_card", "debit_card"] as PaymentMethod[]).map((m) => (
                  <button key={m} onClick={() => confirmCredit(t, m)}
                    className="text-xs px-2.5 py-1 rounded font-bold"
                    style={{ background: "var(--amber)", color: "#09090f" }}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Clique na forma de pagamento recebida para liberar os créditos</p>
        </div>
      )}

      {/* Revenue stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Receita" value={formatCents(revenue)} color="#60a5fa" />
        <Stat label="Despesas" value={formatCents(totalExpenses)} color="#f87171" />
        <Stat label="Lucro líquido" value={formatCents(profit)} color={profit >= 0 ? "#34d399" : "#f87171"} />
        <Stat label="Transações" value={String(transactions.length)} color="#a78bfa" />
      </div>

      {/* Revenue by category */}
      {byType.length > 0 && (
        <div className="rounded-lg p-4 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Receita por categoria</p>
          <div className="flex flex-col gap-2">
            {byType.map(([type, cents]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{TYPE_LABELS[type] ?? type}</span>
                <span className="font-bold" style={{ color: "var(--amber)" }}>{formatCents(cents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner split */}
      <div className="rounded-lg p-4 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Divisão societária</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Receita normal ({split.normal_operator_pct}/{100 - split.normal_operator_pct})</p>
            <p className="font-bold text-white">{formatCents(revenueNormal)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Fora de funcionamento ({split.off_operator_pct}/{100 - split.off_operator_pct})</p>
            <p className="font-bold" style={{ color: "var(--amber)" }}>{formatCents(revenueOff)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Operador</p>
            <p className="font-black" style={{ color: "#34d399" }}>{formatCents(operatorShare)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Sócio investidor</p>
            <p className="font-black" style={{ color: "#60a5fa" }}>{formatCents(partnerShare)}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">
          Despesas rateadas proporcionalmente à receita de cada período · fora de funcionamento = seg, &lt;10h, ≥22h e feriados
        </p>
      </div>

      {/* Founding members */}
      <div className="rounded-lg p-4 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Founding members</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Total</p>
            <p className="font-black text-white">{founding.total}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Voucher usado (10% vitalício)</p>
            <p className="font-black" style={{ color: "#34d399" }}>{founding.voucherUsed}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Voucher pendente (25% disponível)</p>
            <p className="font-black" style={{ color: "var(--amber)" }}>{founding.voucherPending}</p>
          </div>
        </div>
      </div>

      {/* Recurring fixed expenses — confirm before month close */}
      {recurringCategories.length > 0 && (
        <div className="rounded-lg p-4 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Despesas fixas do mês</p>
          <p className="text-[10px] text-slate-600 mb-3">Confirme o valor de cada uma antes de fechar o mês — gerencie a lista em Config</p>
          <div className="flex flex-col gap-2">
            {recurringCategories.map((cat) => {
              const confirmed = monthExpenses.find((e) => e.category_id === cat.id);
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-sm text-white flex-1">{cat.label}</span>
                  {confirmed ? (
                    <span className="flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                      ✓ {formatCents(confirmed.amount_cents)}
                    </span>
                  ) : (
                    <>
                      <input
                        value={recurringInputs[cat.id] ?? ""}
                        onChange={(e) => setRecurringInputs((s) => ({ ...s, [cat.id]: e.target.value }))}
                        placeholder="R$ 0,00" inputMode="decimal"
                        className="w-28 px-3 py-1.5 rounded-lg text-sm border text-white placeholder:text-slate-600 text-right focus:outline-none"
                        style={{ background: "var(--bg)", borderColor: "var(--dim)" }} />
                      <button onClick={() => confirmRecurringExpense(cat)}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: "var(--amber)", color: "#09090f" }}>
                        Confirmar
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses */}
      <div className="rounded-lg p-4 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Despesas do período</p>
        <div className="flex gap-2 mb-3">
          <input value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
            placeholder="Energia, aluguel, reposição de estoque…"
            className="flex-1 px-3 py-2 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--dim)" }} />
          <input value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
            placeholder="R$ 0,00" inputMode="decimal"
            className="w-28 px-3 py-2 rounded-lg text-sm border text-white placeholder:text-slate-600 text-right focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--dim)" }} />
          <button onClick={addExpense} className="text-xs px-4 rounded-lg font-bold" style={{ background: "var(--amber)", color: "#09090f" }}>
            Lançar
          </button>
        </div>
        {expenses.length === 0 ? (
          <p className="text-xs text-slate-600">Nenhuma despesa no período</p>
        ) : (
          <div className="flex flex-col gap-1">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm px-2 py-1.5">
                <span className="text-slate-300">{new Date(e.incurred_on + "T12:00:00").toLocaleDateString("pt-BR")} — {e.description}</span>
                <span className="flex items-center gap-3">
                  <b style={{ color: "#f87171" }}>{formatCents(e.amount_cents)}</b>
                  <button onClick={() => removeExpense(e.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={13} /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions table */}
      {transactions.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <p className="text-slate-500 text-sm">Nenhuma transação no período</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--dim)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--surface)" }}>
              <tr>
                {["Data", "Cliente", "Descrição", "Pagamento", "Período", "Valor"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--dim)" }}>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(t.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{t.customer?.full_name ?? t.customer?.email ?? "Avulso"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{t.description ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{PAYMENT_METHOD_LABELS[t.payment_method as PaymentMethod] ?? t.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: t.is_off_hours ? "rgba(251,191,36,0.15)" : "rgba(100,116,139,0.12)",
                        color: t.is_off_hours ? "var(--amber)" : "var(--muted)",
                      }}>
                      {t.is_off_hours ? "FORA HORÁRIO" : "NORMAL"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-xs" style={{ color: "var(--amber)" }}>{formatCents(t.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}
