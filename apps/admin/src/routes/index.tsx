import { ARENA_NAME } from "@cybergaming/shared";

const stats = [
  { label: "PCs ativos",      value: "10 / 10", color: "#34d399" },
  { label: "Sessões hoje",    value: "—",        color: "var(--amber)" },
  { label: "Receita hoje",    value: "R$ —",     color: "#60a5fa" },
  { label: "Clientes ativos", value: "—",        color: "#a78bfa" },
];

export function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-1">{ARENA_NAME}</h1>
      <p className="text-sm text-slate-500 mb-8">Dashboard — visão geral em tempo real</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
          >
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg p-6 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
      >
        <p className="text-slate-400 text-sm">
          Conecte o Supabase para ver dados em tempo real.
        </p>
        <p className="text-xs text-slate-600 mt-2">
          Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env
        </p>
      </div>
    </div>
  );
}
