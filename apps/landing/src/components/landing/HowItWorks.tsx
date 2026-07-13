import { Reveal } from "./Reveal";

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Cadastre-se grátis",
      s: "Entre pra lista exclusiva e garanta sua prioridade na inauguração. Zero custo, zero compromisso.",
    },
    {
      n: "02",
      t: "Receba o voucher",
      s: "Instantaneamente no seu email: 25% OFF na primeira visita + 10% vitalício pra quem jogar 4h+/mês. Tudo junto.",
    },
    {
      n: "03",
      t: "Entre na inauguração com vantagem",
      s: "No dia da abertura, você entra com prioridade e joga em hardware que a maioria nem sabe que existe.",
    },
  ];

  return (
    <section id="arena" className="px-6 py-16 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — Como funciona
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-6xl">
            3 passos.{" "}
            <span className="bg-gradient-to-r from-accent-secondary to-accent-primary bg-clip-text text-transparent">
              Você dentro.
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-lg text-text-secondary">
            Sem custo. Sem enrolação. Três passos e você está dentro antes de todo mundo.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-0 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 120}>
              <div className="group relative border border-white/5 p-8 md:p-10 transition-colors hover:border-accent-primary/20 hover:bg-bg-secondary/50">
                <div className="font-mono font-display text-7xl font-black text-white/4 transition-colors group-hover:text-accent-primary/10">
                  {step.n}
                </div>
                <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-tight">{step.t}</h3>
                <p className="mt-3 leading-relaxed text-text-secondary">{step.s}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
