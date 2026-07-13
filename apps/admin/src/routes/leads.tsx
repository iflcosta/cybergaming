import { useEffect, useRef, useState } from "react";
import { Search, Download, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: string;
  created_at: string;
  nome: string;
  whatsapp: string;
  email: string;
  jogo_principal: string | null;
  jogo: string | null;
  estilo_jogo: string | null;
  situacao_time: string | null;
  interesse_campeonatos: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  converted_profile_id: string | null;
  is_seed: boolean | null;
}

const FOUNDING_CAP = 200;

const jogoField = (l: Lead) => l.jogo_principal || l.jogo || "—";
const estiloField = (l: Lead) => l.estilo_jogo || l.situacao_time || "—";

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJogo, setFilterJogo] = useState("");
  const [filterEstilo, setFilterEstilo] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("leads-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function onSearch(v: string) {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchQuery(v.toLowerCase()), 300);
  }

  const jogos = [...new Set(leads.map(jogoField).filter((j) => j !== "—"))];
  const estilos = [...new Set(leads.map(estiloField).filter((e) => e !== "—"))];

  const filtered = leads.filter((l) => {
    const matchesSearch = !searchQuery
      || l.nome?.toLowerCase().includes(searchQuery)
      || l.email?.toLowerCase().includes(searchQuery)
      || l.whatsapp?.includes(searchQuery);
    const matchesJogo = !filterJogo || jogoField(l) === filterJogo;
    const matchesEstilo = !filterEstilo || estiloField(l) === filterEstilo;
    return matchesSearch && matchesJogo && matchesEstilo;
  });

  function exportCSV() {
    const headers = ["nome", "email", "whatsapp", "jogo", "estilo", "interesse", "convertido", "data"];
    const rows = filtered.map((l) => [
      l.nome, l.email, l.whatsapp, jogoField(l), estiloField(l), l.interesse_campeonatos ?? "",
      l.converted_profile_id ? "sim" : "não",
      new Date(l.created_at).toLocaleString("pt-BR"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-cyber-arena-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const converted = leads.filter((l) => l.converted_profile_id).length;
  const today = new Date().toISOString().slice(0, 10);
  const leadsToday = leads.filter((l) => l.created_at?.slice(0, 10) === today).length;
  const last24h = leads.filter((l) => new Date(l.created_at).getTime() > Date.now() - 86_400_000).length;

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cadastros da landing — Founding Member Club</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          <Download size={16} />
          CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total</p>
          <p className="text-2xl font-black text-white">{leads.length}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Hoje</p>
          <p className="text-2xl font-black" style={{ color: "#60a5fa" }}>{leadsToday}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Últimas 24h</p>
          <p className="text-2xl font-black" style={{ color: "#a78bfa" }}>{last24h}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Vagas restantes</p>
          <p className="text-2xl font-black" style={{ color: leads.length >= FOUNDING_CAP ? "#f87171" : "var(--amber)" }}>
            {Math.max(0, FOUNDING_CAP - leads.length)} / {FOUNDING_CAP}
          </p>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Converteram em conta</p>
          <p className="text-2xl font-black" style={{ color: "#34d399" }}>{converted}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por nome, email ou WhatsApp…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none"
            style={{ background: "var(--surface)", borderColor: "var(--dim)" }}
          />
        </div>
        <select
          value={filterJogo}
          onChange={(e) => setFilterJogo(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm border text-white focus:outline-none"
          style={{ background: "var(--surface)", borderColor: "var(--dim)" }}
        >
          <option value="">Todos os jogos</option>
          {jogos.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        <select
          value={filterEstilo}
          onChange={(e) => setFilterEstilo(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm border text-white focus:outline-none"
          style={{ background: "var(--surface)", borderColor: "var(--dim)" }}
        >
          <option value="">Todos os estilos</option>
          {estilos.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="mb-4 text-xs text-slate-500">
        {filtered.length} de {leads.length} leads
        {(search || filterJogo || filterEstilo) && (
          <button
            onClick={() => { setSearch(""); setSearchQuery(""); setFilterJogo(""); setFilterEstilo(""); }}
            className="ml-2 hover:underline"
            style={{ color: "var(--amber)" }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <p className="text-slate-500 text-sm">Nenhum lead encontrado</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--dim)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--surface)" }}>
              <tr>
                {["Nome", "Contato", "Jogo", "Estilo", "Campeonatos", "Origem", "Data", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--dim)" }}>
                  <td className="px-4 py-3 font-semibold text-white">
                    {l.nome}
                    {l.is_seed && (
                      <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
                        SEED
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {l.email}<br />{l.whatsapp}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{jogoField(l)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{estiloField(l)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{l.interesse_campeonatos ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {l.utm_source ? `${l.utm_source}/${l.utm_medium ?? "—"}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    {l.converted_profile_id && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", width: "fit-content" }}>
                        <UserCheck size={10} /> conta criada
                      </span>
                    )}
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
