import { Zap } from "lucide-react";
import { Reveal } from "./Reveal";
import { HARDWARE_SPECS } from "./constants";

export function HardwareSection() {
  return (
    <section id="hardware" className="bg-bg-secondary px-6 py-16 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — Especificações
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-6xl">
            Hardware que <span className="text-accent-primary">respeita</span>
          </h2>
          <p className="mt-4 max-w-xl text-lg text-text-secondary">
            Nada de PC de escritório com placa integrada. Aqui é setup de competição ou não é nada.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HARDWARE_SPECS.map((spec, i) => (
            <Reveal key={spec.label} delay={i * 100}>
              <div className="group relative overflow-hidden border border-white/5 bg-bg-primary p-8 transition-all duration-300 hover:border-accent-primary/30 hover:-translate-y-1">
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle at 50% 0%, rgba(168,85,247,0.08) 0%, transparent 60%)" }}
                />
                <spec.icon className="h-6 w-6 text-accent-primary/50 transition-colors group-hover:text-accent-primary" />
                <div className="mt-6 font-display text-3xl font-black text-text-primary">{spec.value}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-text-tertiary">{spec.label}</div>
                <div className="mt-2 text-sm text-text-secondary">{spec.sub}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10" delay={400}>
          <div className="flex items-start gap-3 rounded-xl border border-accent-secondary/20 bg-accent-secondary/5 p-5">
            <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-secondary" />
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Infraestrutura dedicada:</span>{" "}
              link de fibra exclusivo, UPS para todos os setups, ambiente climatizado a 21°C constante e
              headsets e periféricos de alto padrão inclusos.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
