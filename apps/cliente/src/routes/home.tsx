import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { computeOpenBillingPreview, formatCents } from "@/lib/billing";
import type { Session } from "@/lib/database.types";

interface PackageRow {
  code: string;
  label: string;
  price_cents: number;
  duration_min: number;
  detail: string | null;
  sort_order: number;
}

interface ActiveSession extends Session {
  station?: { label: string | null; station_number: number } | null;
}

const PKG_COLORS: Record<string, string> = {
  hora_vale: "#34d399",
  hora_pico: "#60a5fa",
  pacote_3h: "#fbbf24",
  corujao:   "#a78bfa",
};

export function HomePage() {
  const { user, profile, signOut } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] ?? "Jogador";

  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<ActiveSession[]>([]);
  const [now, setNow] = useState(new Date());
  const [discountPct, setDiscountPct] = useState(0);
  const [foundingProgress, setFoundingProgress] = useState<{
    is_founding_member: boolean; lifetime_active_this_month?: boolean; played_min?: number; required_min?: number; remaining_min?: number;
  } | null>(null);

  useEffect(() => {
    supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setPackages((data as PackageRow[]) ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_customer_discount_pct", { p_customer_id: user.id }).then(({ data }) => {
      setDiscountPct(typeof data === "number" ? data : 0);
    });
    supabase.rpc("my_founding_progress").then(({ data }) => {
      if (data) setFoundingProgress(data);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    async function loadSession() {
      const { data } = await supabase
        .from("sessions")
        .select("*, station:pc_stations(label, station_number)")
        .eq("customer_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      setSession((data as ActiveSession) ?? null);
    }

    async function loadHistory() {
      const { data } = await supabase
        .from("sessions")
        .select("*, station:pc_stations(label, station_number)")
        .eq("customer_id", user!.id)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(5);
      setHistory((data as ActiveSession[]) ?? []);
    }

    loadSession();
    loadHistory();
    const ch = supabase.channel("my-session")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `customer_id=eq.${user.id}` },
        () => { loadSession(); loadHistory(); })
      .subscribe();
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(tick); };
  }, [user]);

  const discounted = (cents: number) => Math.round(cents * (100 - discountPct) / 100);
  const rates = {
    vale_cents: discounted(packages.find((p) => p.code === "hora_vale")?.price_cents ?? 1200),
    pico_cents: discounted(packages.find((p) => p.code === "hora_pico")?.price_cents ?? 2500),
  };

  const isOpenSession = session != null && session.package_type === null;
  const elapsedMin = session ? Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 60_000) : 0;
  const remainingMin = session?.planned_end_at
    ? Math.max(0, Math.round((new Date(session.planned_end_at).getTime() - now.getTime()) / 60_000))
    : null;
  const openEstimate = isOpenSession && session
    ? computeOpenBillingPreview(new Date(session.started_at), now, rates)
    : null;

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
        {/* Active session */}
        {session && (
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.4)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--amber)" }}>
                ● Sessão ativa
              </p>
              <span className="text-xs font-black text-[--text]">
                {session.station?.label ?? `PC-${session.station?.station_number ?? "?"}`}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-[--muted] uppercase tracking-wider">Tempo de jogo</p>
                <p className="text-2xl font-black text-[--text]">
                  {Math.floor(elapsedMin / 60) > 0 ? `${Math.floor(elapsedMin / 60)}h` : ""}{elapsedMin % 60}min
                </p>
              </div>
              <div className="text-right">
                {isOpenSession && openEstimate ? (
                  <>
                    <p className="text-[10px] text-[--muted] uppercase tracking-wider">Valor até agora</p>
                    <p className="text-2xl font-black" style={{ color: "var(--amber)" }}>
                      {formatCents(openEstimate.totalCents)}
                    </p>
                  </>
                ) : remainingMin !== null ? (
                  <>
                    <p className="text-[10px] text-[--muted] uppercase tracking-wider">Tempo restante</p>
                    <p className="text-2xl font-black" style={{ color: remainingMin < 10 ? "#f87171" : "var(--amber)" }}>
                      {Math.floor(remainingMin / 60) > 0 ? `${Math.floor(remainingMin / 60)}h` : ""}{remainingMin % 60}min
                    </p>
                  </>
                ) : null}
              </div>
            </div>
            {isOpenSession && (
              <p className="text-[10px] text-[--muted] mt-2">
                Sessão aberta — pague no caixa ao encerrar · atualiza a cada 30s
              </p>
            )}
          </div>
        )}

        {/* Credits */}
        <Link
          to="/creditos"
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
        >
          <div>
            <p className="text-xs text-[--muted] uppercase tracking-wider mb-1">Créditos</p>
            <p className="text-2xl font-black" style={{ color: "var(--amber)" }}>
              {formatCents(profile?.credits_balance ?? 0)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.is_founding_member && (
              <span
                className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ background: "rgba(251,191,36,0.15)", color: "var(--amber)" }}
              >
                ★ FOUNDING
              </span>
            )}
            <span className="text-xs font-bold" style={{ color: "var(--amber)" }}>+ Adicionar</span>
          </div>
        </Link>

        {/* Founding lifetime discount progress */}
        {foundingProgress?.is_founding_member && !foundingProgress.lifetime_active_this_month && foundingProgress.required_min !== undefined && (
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[--text]">Seu 10% vitalício está pausado</p>
              <span className="text-[10px] font-bold" style={{ color: "var(--amber)" }}>
                {Math.floor((foundingProgress.played_min ?? 0) / 60)}h{(foundingProgress.played_min ?? 0) % 60}min / {Math.floor(foundingProgress.required_min / 60)}h{foundingProgress.required_min % 60}min
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, ((foundingProgress.played_min ?? 0) / foundingProgress.required_min) * 100)}%`,
                  background: "var(--amber)",
                }}
              />
            </div>
            <p className="text-[10px] text-[--muted] mt-2">
              Jogue mais {Math.floor((foundingProgress.remaining_min ?? 0) / 60)}h{(foundingProgress.remaining_min ?? 0) % 60}min esse mês pra reativar seu desconto vitalício.
            </p>
          </div>
        )}

        {/* Reservations shortcut */}
        <Link
          to="/reservas"
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
        >
          <div>
            <p className="text-sm font-bold text-[--text]">📅 Reservar um PC</p>
            <p className="text-xs text-[--muted] mt-0.5">Garanta seu horário antes de chegar</p>
          </div>
          <span className="text-[--muted]">→</span>
        </Link>

        {/* Pricing */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-3">
            Pacotes disponíveis
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {packages.map((p) => (
              <div
                key={p.code}
                className="rounded-xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
              >
                <p className="text-xs text-[--muted] mb-2">{p.label}</p>
                {discountPct > 0 ? (
                  <>
                    <p className="text-xl font-black" style={{ color: PKG_COLORS[p.code] ?? "var(--amber)" }}>
                      {formatCents(discounted(p.price_cents))}
                    </p>
                    <p className="text-[10px] text-[--muted] line-through">{formatCents(p.price_cents)}</p>
                    <p className="text-[10px] font-bold" style={{ color: "var(--amber)" }}>
                      ★ {discountPct === 25 ? "Voucher −25%" : "Founding −10%"}
                    </p>
                  </>
                ) : (
                  <p className="text-xl font-black" style={{ color: PKG_COLORS[p.code] ?? "var(--amber)" }}>
                    {formatCents(p.price_cents)}
                  </p>
                )}
                {p.detail && <p className="text-[10px] text-[--muted] mt-1">{p.detail}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Session history */}
        {history.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-3">
              Últimas sessões
            </h2>
            <div className="flex flex-col gap-2">
              {history.map((h) => {
                const dt = h.ended_at ? new Date(h.ended_at) : null;
                const durationMin = h.ended_at
                  ? Math.round((new Date(h.ended_at).getTime() - new Date(h.started_at).getTime()) / 60_000)
                  : null;
                return (
                  <div key={h.id} className="rounded-xl p-3 flex items-center justify-between"
                    style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
                    <div>
                      <p className="text-xs font-bold text-[--text]">
                        {dt?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {h.station?.label ?? `PC-${h.station?.station_number ?? "?"}`}
                      </p>
                      <p className="text-[10px] text-[--muted]">
                        {durationMin !== null ? `${durationMin}min` : ""} · {h.package_type ? (packages.find((p) => p.code === h.package_type)?.label ?? h.package_type) : "sessão aberta"}
                      </p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: "var(--amber)" }}>{formatCents(h.price_cents ?? 0)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
