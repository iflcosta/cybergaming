import { useEffect, useState } from "react";
import { Plus, Package, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatCents, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/types";

interface Product {
  id: string;
  name: string;
  category: "snack" | "bebida" | "outro";
  price_cents: number;
  cost_cents: number;
  stock_qty: number;
  min_stock: number;
  is_active: boolean;
}

const CATEGORY_LABELS = { snack: "Snack", bebida: "Bebida", outro: "Outro" } as const;

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [selling, setSelling] = useState<Product | null>(null);
  const [restocking, setRestocking] = useState<Product | null>(null);

  async function load() {
    const { data } = await supabase.from("products").select("*").order("category").order("name");
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-slate-500 text-sm">Carregando…</div>;

  const lowStock = products.filter((p) => p.is_active && p.stock_qty <= p.min_stock);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Produtos & Estoque</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.filter((p) => p.is_active).length} produtos ativos</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider"
          style={{ background: "var(--amber)", color: "#09090f" }}
        >
          <Plus size={16} />
          Novo Produto
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg px-4 py-3 mb-6 text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
          ⚠ Estoque baixo: {lowStock.map((p) => `${p.name} (${p.stock_qty})`).join(", ")}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--dim)" }}>
          <Package className="mx-auto mb-2 text-slate-600" size={24} />
          <p className="text-slate-500 text-sm">Nenhum produto cadastrado</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--dim)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--surface)" }}>
              <tr>
                {["Produto", "Categoria", "Preço", "Custo", "Estoque", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--dim)", opacity: p.is_active ? 1 : 0.4 }}>
                  <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{CATEGORY_LABELS[p.category]}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--amber)" }}>{formatCents(p.price_cents)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatCents(p.cost_cents)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold"
                      style={{ color: p.stock_qty <= p.min_stock ? "#f87171" : "#34d399" }}
                    >
                      {p.stock_qty} un
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      {p.is_active && p.stock_qty > 0 && (
                        <button
                          onClick={() => setSelling(p)}
                          className="text-xs px-2.5 py-1 rounded font-bold"
                          style={{ background: "var(--amber)", color: "#09090f" }}
                        >
                          Vender
                        </button>
                      )}
                      <button
                        onClick={() => setRestocking(p)}
                        className="text-xs px-2.5 py-1 rounded"
                        style={{ color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}
                      >
                        Estoque
                      </button>
                      <button
                        onClick={() => setEditing(p)}
                        className="text-xs px-2.5 py-1 rounded text-slate-400"
                        style={{ border: "1px solid var(--dim)" }}
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ProductModal product={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {selling && <SellModal product={selling} onClose={() => setSelling(null)} onSold={() => { setSelling(null); load(); }} />}
      {restocking && <RestockModal product={restocking} onClose={() => setRestocking(null)} onDone={() => { setRestocking(null); load(); }} />}
    </div>
  );
}

/* ---------- Create / edit product ---------- */
function ProductModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "snack",
    price: product ? (product.price_cents / 100).toFixed(2) : "",
    cost: product ? (product.cost_cents / 100).toFixed(2) : "",
    stock: product?.stock_qty ?? 0,
    min_stock: product?.min_stock ?? 3,
    is_active: product?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    const price_cents = Math.round(parseFloat(form.price.replace(",", ".")) * 100);
    const cost_cents = Math.round(parseFloat(form.cost.replace(",", ".") || "0") * 100);
    if (!form.name.trim() || isNaN(price_cents) || price_cents < 0) {
      toast.error("Preencha nome e preço válidos");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      price_cents,
      cost_cents: isNaN(cost_cents) ? 0 : cost_cents,
      min_stock: form.min_stock,
      is_active: form.is_active,
      ...(product ? {} : { stock_qty: form.stock }),
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    if (error) {
      toast.error("Erro ao salvar produto");
      setSaving(false);
      return;
    }
    toast.success(product ? "Produto atualizado" : "Produto criado");
    onSaved();
  }

  return (
    <Modal title={product ? "Editar Produto" : "Novo Produto"} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="Nome">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={inputStyle} autoFocus />
        </Field>
        <Field label="Categoria">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product["category"] })} className={inputCls} style={inputStyle}>
            <option value="snack">Snack</option>
            <option value="bebida">Bebida</option>
            <option value="outro">Outro</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço de venda (R$)">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="6,00" inputMode="decimal" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Custo (R$)">
            <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="3,50" inputMode="decimal" className={inputCls} style={inputStyle} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {!product && (
            <Field label="Estoque inicial">
              <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className={inputCls} style={inputStyle} />
            </Field>
          )}
          <Field label="Alerta de estoque mínimo">
            <input type="number" min={0} value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: parseInt(e.target.value) || 0 })} className={inputCls} style={inputStyle} />
          </Field>
        </div>
        {product && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Produto ativo
          </label>
        )}
        <button onClick={save} disabled={saving} className={btnCls} style={{ background: "var(--amber)", color: "#09090f" }}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Quick sale ---------- */
function SellModal({ product, onClose, onSold }: { product: Product; onClose: () => void; onSold: () => void }) {
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);

  async function sell() {
    if (!method) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("sell_product", {
      p_product_id: product.id,
      p_qty: qty,
      p_payment_method: method,
    });
    if (error || !data?.ok) {
      toast.error(data?.error === "insufficient stock" ? `Estoque insuficiente (${data.stock} un)` : "Erro ao registrar venda");
      setSaving(false);
      return;
    }
    toast.success(`Venda: ${qty}x ${product.name} — ${formatCents(data.total_cents)}`);
    onSold();
  }

  return (
    <Modal title={`Vender — ${product.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Quantidade ({product.stock_qty} disponíveis)</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded font-bold text-white" style={{ background: "var(--bg)", border: "1px solid var(--dim)" }}>−</button>
            <span className="text-lg font-black text-white w-8 text-center">{qty}</span>
            <button onClick={() => setQty(Math.min(product.stock_qty, qty + 1))} className="w-8 h-8 rounded font-bold text-white" style={{ background: "var(--bg)", border: "1px solid var(--dim)" }}>+</button>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "var(--bg)", border: "1px solid var(--dim)" }}>
          <span className="text-xs text-slate-400 uppercase tracking-wider">Total</span>
          <span className="text-xl font-black" style={{ color: "var(--amber)" }}>{formatCents(product.price_cents * qty)}</span>
        </div>
        <div className="flex flex-col gap-2">
          {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][])
            .filter(([k]) => k !== "credits")
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMethod(key)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors hover:bg-white/5"
                style={{ border: `1px solid ${method === key ? "var(--amber)" : "var(--dim)"}`, color: method === key ? "var(--amber)" : "var(--text)" }}
              >
                {label}
              </button>
            ))}
        </div>
        <button onClick={sell} disabled={!method || saving} className={btnCls} style={{ background: "var(--amber)", color: "#09090f" }}>
          <ShoppingCart size={14} className="inline mr-1.5 -mt-0.5" />
          {saving ? "Registrando…" : "Confirmar Venda"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Restock / adjust ---------- */
function RestockModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<"purchase" | "adjustment" | "loss">("purchase");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function apply() {
    const qty = parseInt(delta);
    if (!qty || isNaN(qty)) { toast.error("Informe a quantidade"); return; }
    const signed = reason === "loss" ? -Math.abs(qty) : qty;
    setSaving(true);
    const { data, error } = await supabase.rpc("adjust_stock", {
      p_product_id: product.id,
      p_qty_delta: signed,
      p_reason: reason,
      p_note: note || null,
    });
    if (error || !data?.ok) {
      toast.error("Erro ao ajustar estoque (não pode ficar negativo)");
      setSaving(false);
      return;
    }
    toast.success(`Estoque de ${product.name}: ${data.stock_qty} un`);
    onDone();
  }

  return (
    <Modal title={`Estoque — ${product.name} (${product.stock_qty} un)`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="Operação">
          <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className={inputCls} style={inputStyle}>
            <option value="purchase">Entrada (compra)</option>
            <option value="adjustment">Ajuste (+ ou −)</option>
            <option value="loss">Perda / vencido</option>
          </select>
        </Field>
        <Field label={reason === "adjustment" ? "Quantidade (use − para reduzir)" : "Quantidade"}>
          <input value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" placeholder="12" className={inputCls} style={inputStyle} autoFocus />
        </Field>
        <Field label="Observação (opcional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="NF 1234, fornecedor X…" className={inputCls} style={inputStyle} />
        </Field>
        <button onClick={apply} disabled={saving} className={btnCls} style={{ background: "var(--amber)", color: "#09090f" }}>
          {saving ? "Aplicando…" : "Aplicar"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- shared bits ---------- */
const inputCls = "w-full px-3 py-2.5 rounded-lg text-sm border text-white placeholder:text-slate-600 focus:outline-none";
const inputStyle = { background: "var(--bg)", borderColor: "var(--dim)" } as const;
const btnCls = "w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider disabled:opacity-50";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--dim)" }}>
          <h2 className="font-bold text-white text-sm">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
