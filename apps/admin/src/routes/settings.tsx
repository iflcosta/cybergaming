import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatCents, type PcStation } from "@/lib/types";

interface PackageRow {
  code: string;
  label: string;
  price_cents: number;
  duration_min: number;
  detail: string | null;
  founding_price_cents: number | null;
  is_active: boolean;
  sort_order: number;
}

interface Holiday { day: string; label: string }

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
      <StationsSection />
    </div>
  );
}

/* ---------- Tarifas ---------- */
function PackagesSection() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [edited, setEdited] = useState<Record<string, { price: string; founding: string }>>({});

  async function load() {
    const { data } = await supabase.from("packages").select("*").order("sort_order");
    setRows((data as PackageRow[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(row: PackageRow) {
    const e = edited[row.code];
    if (!e) return;
    const price_cents = Math.round(parseFloat(e.price.replace(",", ".")) * 100);
    const founding = e.founding.trim()
      ? Math.round(parseFloat(e.founding.replace(",", ".")) * 100)
      : null;
    if (isNaN(price_cents) || price_cents < 0) { toast.error("Preço inválido"); return; }
    const { error } = await supabase
      .from("packages")
      .update({ price_cents, founding_price_cents: founding, updated_at: new Date().toISOString() })
      .eq("code", row.code);
    if (error) { toast.error("Erro ao salvar tarifa"); return; }
    toast.success(`${row.label} atualizado`);
    setEdited((prev) => { const n = { ...prev }; delete n[row.code]; return n; });
    load();
  }

  return (
    <Section title="Tarifas" subtitle="Preços aplicados no PDV, sessão aberta e app do cliente">
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const e = edited[r.code] ?? {
            price: (r.price_cents / 100).toFixed(2).replace(".", ","),
            founding: r.founding_price_cents ? (r.founding_price_cents / 100).toFixed(2).replace(".", ",") : "",
          };
          const dirty = !!edited[r.code];
          return (
            <div key={r.code} className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{r.label}</p>
                <p className="text-[11px] text-slate-500">{r.detail}</p>
              </div>
              <label className="text-[10px] text-slate-500 uppercase">Preço R$</label>
              <input
                value={e.price}
                onChange={(ev) => setEdited({ ...edited, [r.code]: { ...e, price: ev.target.value } })}
                className="w-20 px-2 py-1.5 rounded text-sm text-right border text-white focus:outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--dim)" }}
                inputMode="decimal"
              />
              <label className="text-[10px] text-slate-500 uppercase">Founding R$</label>
              <input
                value={e.founding}
                onChange={(ev) => setEdited({ ...edited, [r.code]: { ...e, founding: ev.target.value } })}
                placeholder="—"
                className="w-20 px-2 py-1.5 rounded text-sm text-right border text-white placeholder:text-slate-600 focus:outline-none"
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

/* ---------- PCs ---------- */
function StationsSection() {
  const [stations, setStations] = useState<PcStation[]>([]);

  async function load() {
    const { data } = await supabase.from("pc_stations").select("*").order("station_number");
    setStations(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function toggle(s: PcStation) {
    const { error } = await supabase.from("pc_stations").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) { toast.error("Erro ao atualizar PC"); return; }
    toast.success(`${s.label ?? `PC-${s.station_number}`} ${s.is_active ? "desativado" : "ativado"}`);
    load();
  }

  return (
    <Section title="PCs" subtitle="Desative um PC em manutenção para ele sair do PDV">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {stations.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s)}
            className="px-3 py-2.5 rounded-lg text-sm font-bold transition-colors"
            style={{
              background: s.is_active ? "var(--surface)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${s.is_active ? "var(--dim)" : "rgba(239,68,68,0.35)"}`,
              color: s.is_active ? "#34d399" : "#f87171",
            }}
          >
            {s.label ?? `PC-${s.station_number}`}
            <span className="block text-[9px] font-normal mt-0.5" style={{ color: "var(--muted)" }}>
              {s.is_active ? "ativo" : "manutenção"}
            </span>
          </button>
        ))}
      </div>
    </Section>
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
