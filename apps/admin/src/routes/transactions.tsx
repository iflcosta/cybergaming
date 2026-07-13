import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCents, PAYMENT_METHOD_LABELS, type Transaction, type PaymentMethod } from "@/lib/types";

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("transactions")
      .select("*, customer:profiles(full_name, email)")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    const txs = (data as Transaction[]) ?? [];
    setTransactions(txs);
    setRevenueToday(txs.filter((t) => t.status === "paid").reduce((acc, t) => acc + t.amount_cents, 0));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-6">Financeiro</h1>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Receita hoje</p>
            <p className="text-2xl font-black" style={{ color: "#60a5fa" }}>{formatCents(revenueToday)}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Transações</p>
            <p className="text-2xl font-black text-white">{transactions.length}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Ticket médio</p>
            <p className="text-2xl font-black" style={{ color: "#34d399" }}>
              {transactions.length ? formatCents(Math.round(revenueToday / transactions.length)) : "R$0,00"}
            </p>
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <p className="text-slate-500 text-sm">Nenhuma transação hoje</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--dim)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--surface)" }}>
              <tr>
                {["Horário", "Cliente", "Descrição", "Pagamento", "Valor", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--dim)" }}>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(t.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {t.customer?.full_name ?? t.customer?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{t.description ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {PAYMENT_METHOD_LABELS[t.payment_method as PaymentMethod] ?? t.payment_method}
                  </td>
                  <td className="px-4 py-3 font-bold text-xs" style={{ color: "var(--amber)" }}>
                    {formatCents(t.amount_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: t.status === "paid" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: t.status === "paid" ? "#22c55e" : "#f87171",
                      }}
                    >
                      {t.status === "paid" ? "PAGO" : t.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
