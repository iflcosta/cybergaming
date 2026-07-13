import { useEffect, useState } from "react";
import { Trash2, Wifi, WifiOff, KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatCents, type PcStation } from "@/lib/types";

interface PackageRow {
  code: string;
  label: string;
  price_cents: number;
  duration_min: number;
  detail: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Holiday { day: string; label: string }

interface RecurringExpenseCategory {
  id: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">Tarifas, sociedade, feriados e PCs</p>
      </div>
      <PackagesSection />
      <SplitSection />
      <HolidaysSection />
      <RecurringExpensesSection />
      <StationsSection />
      <AgentPinSection />
    </div>
  );
}

/* ---------- Despesas fixas recorrentes ---------- */
function RecurringExpensesSection() {
  const [rows, setRows] = useState<RecurringExpenseCategory[]>([]);
  const [label, setLabel] = useState("");

  async function load() {
    const { data } = await supabase.from("recurring_expense_categories").select("*").order("sort_order");
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!label.trim()) return;
    const { error } = await supabase.from("recurring_expense_categories").insert({
      label: label.trim(), sort_order: rows.length,
    });
    if (error) { toast.error("Erro ao adicionar categoria"); return; }
    setLabel("");
    load();
  }

  async function toggle(row: RecurringExpenseCategory) {
    const { error } = await supabase.from("recurring_expense_categories").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("recurring_expense_categories").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    load();
  }

  return (
    <Section title="Despesas fixas recorrentes" subtitle="Categorias que aparecem pra confirmar todo mês no Financeiro, antes do fechamento">
      <div className="flex gap-2 mb-3 max-w-md">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nova categoria (ex: Aluguel)"
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--dim)", color: "white" }}
        />
        <button onClick={add} className="px-4 py-2 rounded-lg text-xs font-bold" style={{ background: "var(--amber)", color: "#09090f" }}>
          Adicionar
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-2 rounded-lg text-sm" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
            <button onClick={() => toggle(r)} className="text-left flex-1" style={{ color: r.is_active ? "white" : "var(--muted)" }}>
              {r.label} {!r.is_active && <span className="text-[10px]">(inativa)</span>}
            </button>
            <button onClick={() => remove(r.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-slate-600">Nenhuma categoria cadastrada</p>}
      </div>
    </Section>
  );
}

/* ---------- PIN de acesso staff no agente ---------- */
function AgentPinSection() {
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (pin.length < 4) { toast.error("PIN precisa ter ao menos 4 dígitos"); return; }
    setSaving(true);
    const { data, error } = await supabase.rpc("set_agent_staff_pin", { p_pin: pin });
    setSaving(false);
    if (error || !data?.ok) { toast.error("Erro ao salvar PIN"); return; }
    toast.success("PIN atualizado");
    setPin("");
  }

  return (
    <Section title="PIN de acesso staff (agente)" subtitle="Usado no PC pra abrir sessão de cortesia sem cobrar, direto na tela de bloqueio">
      <div className="flex gap-2 max-w-xs">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="Novo PIN"
          inputMode="numeric"
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--dim)", color: "white" }}
        />
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-xs font-bold"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          Salvar
        </button>
      </div>
    </Section>
  );
}

/* ---------- Tarifas ---------- */
function PackagesSection() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("packages").select("*").order("sort_order");
    setRows((data as PackageRow[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(row: PackageRow) {
    const priceStr = edited[row.code];
    if (priceStr === undefined) return;
    const price_cents = Math.round(parseFloat(priceStr.replace(",", ".")) * 100);
    if (isNaN(price_cents) || price_cents < 0) { toast.error("Preço inválido"); return; }
    const { error } = await supabase
      .from("packages")
      .update({ price_cents, updated_at: new Date().toISOString() })
      .eq("code", row.code);
    if (error) { toast.error("Erro ao salvar tarifa"); return; }
    toast.success(`${row.label} atualizado`);
    setEdited((prev) => { const n = { ...prev }; delete n[row.code]; return n; });
    load();
  }

  return (
    <Section title="Tarifas" subtitle="Preços aplicados no PDV, sessão aberta, reservas e app do cliente">
      <div className="flex flex-col gap-2 mb-3">
        {rows.map((r) => {
          const priceStr = edited[r.code] ?? (r.price_cents / 100).toFixed(2).replace(".", ",");
          const dirty = edited[r.code] !== undefined;
          return (
            <div key={r.code} className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{r.label}</p>
                <p className="text-[11px] text-slate-500">{r.detail}</p>
              </div>
              <label className="text-[10px] text-slate-500 uppercase">Preço R$</label>
              <input
                value={priceStr}
                onChange={(ev) => setEdited({ ...edited, [r.code]: ev.target.value })}
                className="w-20 px-2 py-1.5 rounded text-sm text-right border text-white focus:outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--dim)" }}
                inputMode="decimal"
              />
              <button
                onClick={() => save(r)}
                disabled={!dirty}
                className="text-xs px-3 py-1.5 rounded font-bold disabled:opacity-30"
                style={{ background: "var(--amber)", color: "#09090f" }}
              >
                Salvar
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500">
        Desconto Founding Member é automático: <b className="text-white">25%</b> na primeira compra (voucher, válido 60 dias do cadastro) e{" "}
        <b className="text-white">10%</b> vitalício depois — calculado sobre o preço acima, sem precisar editar nada aqui.
      </p>
    </Section>
  );
}

/* ---------- Divisão societária ---------- */
function SplitSection() {
  const [normal, setNormal] = useState("50");
  const [off, setOff] = useState("60");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "partner_split").single().then(({ data }) => {
      if (data?.value) {
        setNormal(String(data.value.normal_operator_pct ?? 50));
        setOff(String(data.value.off_operator_pct ?? 60));
      }
      setLoaded(true);
    });
  }, []);

  async function save() {
    const n = parseInt(normal), o = parseInt(off);
    if (isNaN(n) || isNaN(o) || n < 0 || n > 100 || o < 0 || o > 100) { toast.error("Percentuais inválidos"); return; }
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "partner_split", value: { normal_operator_pct: n, off_operator_pct: o }, updated_at: new Date().toISOString() });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Divisão societária atualizada");
  }

  if (!loaded) return null;

  return (
    <Section title="Divisão societária" subtitle="Percentual do OPERADOR sobre o lucro líquido; o restante é do sócio investidor">
      <div className="flex items-end gap-4 rounded-lg px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <div>
          <label className="text-[10px] text-slate-500 uppercase block mb-1">Horário normal (%)</label>
          <input value={normal} onChange={(e) => setNormal(e.target.value)} inputMode="numeric"
            className="w-20 px-2 py-1.5 rounded text-sm text-right border text-white focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--dim)" }} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase block mb-1">Fora de funcionamento (%)</label>
          <input value={off} onChange={(e) => setOff(e.target.value)} inputMode="numeric"
            className="w-20 px-2 py-1.5 rounded text-sm text-right border text-white focus:outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--dim)" }} />
        </div>
        <p className="text-[11px] text-slate-500 flex-1">
          Fora de funcionamento = segunda-feira, antes das 10h, após as 22h (inclui corujão) e feriados cadastrados abaixo.
        </p>
        <button onClick={save} className="text-xs px-3 py-1.5 rounded font-bold" style={{ background: "var(--amber)", color: "#09090f" }}>
          Salvar
        </button>
      </div>
    </Section>
  );
}

/* ---------- Feriados ---------- */
function HolidaysSection() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [day, setDay] = useState("");
  const [label, setLabel] = useState("");

  async function load() {
    const { data } = await supabase.from("holidays").select("*").order("day");
    setHolidays((data as Holiday[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!day || !label.trim()) { toast.error("Informe data e nome do feriado"); return; }
    const { error } = await supabase.from("holidays").insert({ day, label: label.trim() });
    if (error) { toast.error("Erro (data já cadastrada?)"); return; }
    setDay(""); setLabel("");
    load();
  }

  async function remove(d: string) {
    await supabase.from("holidays").delete().eq("day", d);
    load();
  }

  return (
    <Section title="Feriados" subtitle="Dias inteiros contados como fora de funcionamento (60/40)">
      <div className="flex gap-2 mb-3">
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border text-white focus:outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--dim)" }} />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome do feriado"
          className="flex-1 px-3 py-2 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--dim)" }} />
        <button onClick={add} className="text-xs px-4 rounded-lg font-bold" style={{ background: "var(--amber)", color: "#09090f" }}>
          Adicionar
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {holidays.map((h) => (
          <div key={h.day} className="flex items-center justify-between px-4 py-2 rounded-lg text-sm" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
            <span className="text-white">{new Date(h.day + "T12:00:00").toLocaleDateString("pt-BR")} — {h.label}</span>
            <button onClick={() => remove(h.day)} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
        {holidays.length === 0 && <p className="text-xs text-slate-600">Nenhum feriado cadastrado</p>}
      </div>
    </Section>
  );
}

const ONLINE_THRESHOLD_MS = 90_000; // agent heartbeats every ~30s

function isOnline(s: PcStation) {
  if (!s.last_seen_at) return false;
  return Date.now() - new Date(s.last_seen_at).getTime() < ONLINE_THRESHOLD_MS;
}

/* ---------- PCs ---------- */
function StationsSection() {
  const [stations, setStations] = useState<PcStation[]>([]);
  const [pairingStation, setPairingStation] = useState<PcStation | null>(null);

  async function load() {
    const { data } = await supabase.from("pc_stations").select("*").order("station_number");
    setStations(data ?? []);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  async function toggle(s: PcStation) {
    const { error } = await supabase.from("pc_stations").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) { toast.error("Erro ao atualizar PC"); return; }
    toast.success(`${s.label ?? `PC-${s.station_number}`} ${s.is_active ? "desativado" : "ativado"}`);
    load();
  }

  return (
    <Section title="PCs" subtitle="Desative um PC em manutenção para ele sair do PDV. Use a chave para parear o agente de máquina.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {stations.map((s) => {
          const online = isOnline(s);
          return (
            <div
              key={s.id}
              className="relative px-3 py-2.5 rounded-lg text-sm font-bold transition-colors"
              style={{
                background: s.is_active ? "var(--surface)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${s.is_active ? "var(--dim)" : "rgba(239,68,68,0.35)"}`,
                color: s.is_active ? "#34d399" : "#f87171",
              }}
            >
              <button onClick={() => toggle(s)} className="block w-full text-left">
                {s.label ?? `PC-${s.station_number}`}
                <span className="flex items-center gap-1 text-[9px] font-normal mt-0.5" style={{ color: "var(--muted)" }}>
                  {s.is_active ? "ativo" : "manutenção"}
                  {online ? <Wifi size={10} className="text-emerald-400" /> : <WifiOff size={10} className="text-slate-600" />}
                </span>
              </button>
              <button
                onClick={() => setPairingStation(s)}
                title="Parear agente de máquina"
                className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-white/10"
                style={{ color: "var(--muted)" }}
              >
                <KeyRound size={12} />
              </button>
            </div>
          );
        })}
      </div>
      {pairingStation && (
        <PairingModal station={pairingStation} onClose={() => setPairingStation(null)} />
      )}
    </Section>
  );
}

function PairingModal({ station, onClose }: { station: PcStation; onClose: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const { data, error } = await supabase.rpc("generate_pairing_code", { p_station_id: station.id });
    setLoading(false);
    if (error || !data?.ok) {
      toast.error("Erro ao gerar código");
      return;
    }
    setCode(data.code);
    setExpiresAt(data.expires_at);
  }

  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-xs rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Parear {station.label ?? `PC-${station.station_number}`}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        {loading && <p className="text-xs text-slate-500">Gerando código…</p>}
        {code && (
          <>
            <p className="text-3xl font-black tracking-[0.3em] text-center py-4" style={{ color: "var(--amber)" }}>
              {code}
            </p>
            <p className="text-[11px] text-slate-500 text-center mb-3">
              Digite este código no agente instalado neste PC. Válido até{" "}
              {expiresAt ? new Date(expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}.
            </p>
          </>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-2 rounded-lg text-xs font-bold"
          style={{ background: "var(--dim)", color: "white" }}
        >
          Gerar novo código
        </button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
      {children}
    </section>
  );
}
