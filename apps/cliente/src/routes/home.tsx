import { useAuth } from "@/contexts/auth";

const PRICES = [
  { key: "hora_vale",  label: "Hora Vale",  price: "R$12", detail: "Seg–Sex até 18h", color: "#34d399" },
  { key: "hora_pico",  label: "Hora Pico",  price: "R$15", detail: "Pico e fins de semana", color: "#60a5fa" },
  { key: "pacote_3h",  label: "Pacote 3h",  price: "R$39", detail: "R$13/h — Popular ⭐", color: "#fbbf24" },
  { key: "corujao",    label: "Corujão",    price: "R$79,90", detail: "Sex/Sáb · 22h–06h", color: "#a78bfa" },
];

export function HomePage() {
  const { profile, signOut } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] ?? "Jogador";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--dim)" }}
      >
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[--muted]">
            Cyber Brasil Arena
          </p>
          <p className="text-sm font-bold">
            Olá, <span style={{ color: "var(--amber)" }}>{firstName}</span> 👾
          </p>
        </div>
        <button
          onClick={signOut}
          className="text-xs text-[--muted] hover:text-[--text] transition-colors"
        >
          Sair
        </button>
      </header>

      <main className="flex-1 px-5 py-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Credits */}
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
        >
          <div>
            <p className="text-xs text-[--muted] uppercase tracking-wider mb-1">Créditos</p>
            <p className="text-2xl font-black" style={{ color: "var(--amber)" }}>
              R${((profile?.credits_balance ?? 0) / 100).toFixed(2).replace(".", ",")}
            </p>
          </div>
          {profile?.is_founding_member && (
            <span
              className="text-[10px] font-bold px-2 py-1 rounded"
              style={{ background: "rgba(251,191,36,0.15)", color: "var(--amber)" }}
            >
              ★ FOUNDING
            </span>
          )}
        </div>

        {/* Pricing */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-3">
            Pacotes disponíveis
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {PRICES.map((p) => (
              <div
                key={p.key}
                className="rounded-xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
              >
                <p className="text-xs text-[--muted] mb-2">{p.label}</p>
                <p className="text-xl font-black" style={{ color: p.color }}>{p.price}</p>
                <p className="text-[10px] text-[--muted] mt-1">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coming soon */}
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}
        >
          <p className="text-sm font-bold text-[--muted]">Reservas em breve</p>
          <p className="text-xs text-[--muted] mt-1">
            Reserve seu PC pelo app assim que abrirmos
          </p>
        </div>
      </main>
    </div>
  );
}
