import { useEffect, useState } from "react";
import { Clock, Moon, Package, ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { supabase } from "@/lib/supabase";

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(",00", "");
}

// Static fallback so the page never breaks if the fetch fails — but the real
// source of truth is the `packages` table, kept in sync automatically below.
const FALLBACK_PRICES: Record<string, string> = {
  hora_vale: "R$ 12", hora_pico: "R$ 25", pacote_3h: "R$ 49,90", corujao: "R$ 79,90",
};

const PRICING_META = [
  { code: "hora_vale", icon: Clock, title: "Hora Vale", unit: "/hora", desc: "Ter a Sex, 10h às 18h",
    color: "text-green-400", border: "border-green-500/20", bg: "bg-green-500/5" },
  { code: "hora_pico", icon: Clock, title: "Hora Pico", unit: "/hora", desc: "Ter a Sex 18h–22h · Sáb e Dom",
    color: "text-accent-primary", border: "border-accent-primary/20", bg: "bg-accent-primary/5" },
  { code: "pacote_3h", icon: Package, title: "Pacote 3h", unit: "", desc: "Válido em qualquer horário",
    color: "text-accent-secondary", border: "border-accent-secondary/20", bg: "bg-accent-secondary/5", popular: true },
  { code: "corujao", icon: Moon, title: "Corujão", unit: "", desc: "Sex e Sáb · 22h às 06h",
    color: "text-yellow-400", border: "border-yellow-500/20", bg: "bg-yellow-500/5" },
];

export function PricingSection() {
  const [prices, setPrices] = useState<Record<string, string>>(FALLBACK_PRICES);

  useEffect(() => {
    supabase
      .from("packages")
      .select("code,price_cents")
      .eq("is_active", true)
      .then(({ data }) => {
        if (!data?.length) return;
        const next = { ...FALLBACK_PRICES };
        for (const row of data as { code: string; price_cents: number }[]) {
          next[row.code] = formatCents(row.price_cents);
        }
        setPrices(next);
      });
  }, []);

  const PRICING = PRICING_META.map((m) => ({ ...m, price: prices[m.code] ?? FALLBACK_PRICES[m.code] }));

  return (
    <section id="precos" className="px-6 py-16 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal className="text-center">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — Preços
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-6xl">
            Transparência <span className="text-accent-primary">total</span>
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-lg text-text-secondary">
            Sem surpresa, sem taxa escondida. Escolha o formato que encaixa no seu estilo.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING.map((plan, i) => (
            <Reveal key={plan.title} delay={i * 100}>
              <div
                className={`relative overflow-hidden border ${plan.border} ${plan.bg} rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-opacity-50 ${
                  plan.popular ? "ring-1 ring-accent-primary/30" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute right-3 top-3 rounded-full bg-accent-primary/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent-primary">
                    Popular
                  </div>
                )}
                <plan.icon className={`h-6 w-6 ${plan.color}`} />
                <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                  {plan.title}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`font-display text-3xl font-black ${plan.color}`}>
                    {plan.price}
                  </span>
                  {plan.unit && (
                    <span className="text-sm text-text-tertiary">{plan.unit}</span>
                  )}
                </div>
                <div className="mt-3 text-sm text-text-secondary">{plan.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10">
          <div className="rounded-xl border border-white/5 bg-bg-secondary p-6 text-center">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-accent-primary">Founding members:</span>{" "}
              25% OFF no 1º pacote + 10% vitalício em tudo.{" "}
              <a href="#form" className="inline-flex items-center gap-1 font-semibold text-accent-primary transition-colors hover:text-accent-secondary">
                Garantir desconto <ArrowRight className="h-3 w-3" />
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
