import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  LogOut,
  Download,
  Search,
  Users,
  TrendingUp,
  Calendar,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Cyber Brasil Arena" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Lead = {
  id: string;
  created_at: string;
  nome: string;
  whatsapp: string;
  email: string;
  jogo_principal?: string;
  estilo_jogo?: string;
  interesse_campeonatos?: string;
  jogo?: string;
  faixa_etaria?: string;
  situacao_time?: string;
  lgpd_aceito?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  origem_url?: string;
};

// ─── auth gate ───────────────────────────────────────────────────────────────

function AdminPage() {
  const [session, setSession] = useState<"loading" | "logged-out" | "logged-in">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? "logged-in" : "logged-out");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ? "logged-in" : "logged-out");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === "loading") {
    return (
      <Shell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
        </div>
      </Shell>
    );
  }

  if (session === "logged-out") return <LoginScreen />;

  return <Dashboard />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}

// ─── login ───────────────────────────────────────────────────────────────────

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError("Email ou senha incorretos.");
    setLoading(false);
  }

  return (
    <Shell>
      <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-gradient-to-br from-accent-primary to-accent-secondary">
            <span className="font-display text-sm font-black text-bg-primary tracking-tight">CB</span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-text-tertiary">Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label htmlFor="adm-email" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
              Email
            </label>
            <input
              id="adm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full border border-white/8 bg-bg-secondary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary/60 focus:outline-none"
              placeholder="admin@email.com"
            />
          </div>
          <div>
            <label htmlFor="adm-pass" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
              Senha
            </label>
            <div className="relative">
              <input
                id="adm-pass"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full border border-white/8 bg-bg-secondary px-4 py-3 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary/60 focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 bg-accent-primary py-3 text-sm font-bold uppercase tracking-widest text-text-on-accent transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Entrar
          </button>
        </form>
      </div>
    </Shell>
  );
}

// ─── dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterJogo, setFilterJogo] = useState("");
  const [filterEstilo, setFilterEstilo] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setLeads(data as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        setLeads((prev) => [payload.new as Lead, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const jogoField = (l: Lead) => l.jogo_principal || l.jogo || "—";
  const estiloField = (l: Lead) => l.estilo_jogo || l.situacao_time || "—";
  const interesseField = (l: Lead) => l.interesse_campeonatos || "—";

  const jogos = [...new Set(leads.map(jogoField).filter((j) => j !== "—"))];
  const estilos = [...new Set(leads.map(estiloField).filter((e) => e !== "—"))];

  const filtered = leads.filter((l) => {
    const matchesSearch =
      !search ||
      l.nome?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.whatsapp?.includes(search);
    const matchesJogo = !filterJogo || jogoField(l) === filterJogo;
    const matchesEstilo = !filterEstilo || estiloField(l) === filterEstilo;
    return matchesSearch && matchesJogo && matchesEstilo;
  });

  const today = new Date().toISOString().slice(0, 10);
  const leadsToday = leads.filter((l) => l.created_at?.slice(0, 10) === today).length;
  const last24h = leads.filter(
    (l) => new Date(l.created_at).getTime() > Date.now() - 86400000,
  ).length;

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function exportCSV() {
    const headers = ["nome", "email", "whatsapp", "jogo", "estilo", "interesse", "data"];
    const rows = filtered.map((l) => [
      l.nome,
      l.email,
      l.whatsapp,
      jogoField(l),
      estiloField(l),
      interesseField(l),
      new Date(l.created_at).toLocaleString("pt-BR"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-cyber-arena-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Dashboard<span className="text-accent-primary">.</span>
          </h1>
          <p className="text-sm text-text-tertiary">Leads — Founding Member Club</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLeads}
            className="flex items-center gap-2 border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-secondary transition-colors hover:border-accent-primary/40 hover:text-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-secondary transition-colors hover:border-accent-secondary/40 hover:text-text-primary"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-secondary transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Total" value={leads.length} color="text-accent-primary" />
        <StatCard icon={TrendingUp} label="Últimas 24h" value={last24h} color="text-accent-secondary" />
        <StatCard icon={Calendar} label="Hoje" value={leadsToday} color="text-accent-tertiary" />
        <StatCard
          icon={Users}
          label="Vagas restantes"
          value={200 - leads.length}
          color={leads.length >= 180 ? "text-destructive" : "text-text-primary"}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-white/8 bg-bg-secondary py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary/60 focus:outline-none"
          />
        </div>
        <select
          value={filterJogo}
          onChange={(e) => setFilterJogo(e.target.value)}
          className="border border-white/8 bg-bg-secondary px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary/60 focus:outline-none"
        >
          <option value="">Todos os jogos</option>
          {jogos.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
        <select
          value={filterEstilo}
          onChange={(e) => setFilterEstilo(e.target.value)}
          className="border border-white/8 bg-bg-secondary px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary/60 focus:outline-none"
        >
          <option value="">Todos os estilos</option>
          {estilos.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <div className="mt-1 text-xs text-text-tertiary">
        {filtered.length} de {leads.length} leads
        {search || filterJogo || filterEstilo ? (
          <button onClick={() => { setSearch(""); setFilterJogo(""); setFilterEstilo(""); }} className="ml-2 text-accent-primary hover:underline">
            Limpar filtros
          </button>
        ) : null}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-white/5">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-bg-secondary text-left">
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">#</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Nome</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Email</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">WhatsApp</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Jogo</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Estilo</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Campeonatos</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">UTM</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-text-tertiary">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent-primary" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-text-tertiary">
                  {leads.length === 0 ? "Nenhum lead ainda" : "Nenhum resultado para o filtro"}
                </td>
              </tr>
            ) : (
              filtered.map((lead, i) => (
                <tr
                  key={lead.id}
                  className="border-b border-white/5 transition-colors hover:bg-bg-secondary/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-text-tertiary tabular-nums">
                    {leads.length - leads.indexOf(lead)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-text-primary">{lead.nome}</td>
                  <td className="px-4 py-3 text-text-secondary">{lead.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{lead.whatsapp}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-text-secondary">
                      {jogoField(lead)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{estiloField(lead)}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{interesseField(lead)}</td>
                  <td className="px-4 py-3 text-xs text-text-tertiary">
                    {lead.utm_source ? `${lead.utm_source}/${lead.utm_medium || "—"}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-tertiary tabular-nums whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-center text-[10px] uppercase tracking-widest text-text-tertiary">
        Dados protegidos pela LGPD · Acesso restrito a administradores
      </div>
    </Shell>
  );
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="border border-white/5 bg-bg-secondary p-5">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color} opacity-60`} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
          {label}
        </span>
      </div>
      <div className={`mt-2 font-display text-3xl font-black tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
}
