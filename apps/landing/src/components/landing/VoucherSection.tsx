import { ArrowRight, Check } from "lucide-react";
import { TOTAL_SPOTS } from "./constants";
import { Reveal } from "./Reveal";

export function VoucherSection() {
  return (
    <section id="voucher" className="px-6 py-16 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-accent-primary/30 bg-bg-secondary p-1">
          <div className="pointer-events-none absolute left-0 top-0 h-16 w-16 border-l-2 border-t-2 border-accent-primary/60" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-16 border-b-2 border-r-2 border-accent-primary/60" />

          <div className="flex flex-col rounded-xl bg-bg-primary md:flex-row">
            <div className="flex flex-col items-center justify-center gap-5 border-b border-white/5 p-6 text-center md:order-2 md:w-56 md:border-b-0 md:border-l md:p-10">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  Vagas
                </div>
                <div className="mt-2 font-display text-3xl font-black text-accent-primary leading-none">
                  Só 200
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  voucher expira 60 dias após a abertura
                </div>
              </div>

              <a
                href="#form"
                className="inline-flex w-full items-center justify-center gap-2 border border-accent-primary/40 px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-accent-primary transition-all hover:bg-accent-primary hover:text-text-on-accent"
              >
                Garantir vaga
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="flex-1 p-8 md:order-1 md:p-14">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-widest text-accent-primary">
                Founding Member Club — {TOTAL_SPOTS} vagas
              </div>
              <h2
                className="font-display font-black uppercase leading-tight tracking-tighter"
                style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)" }}
              >
                Founding members
                <br />
                <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                  nunca pagam cheio.
                </span>
              </h2>
              <p className="mt-5 text-text-secondary">
                Quem entrar agora não escolhe entre um desconto ou outro — ganha os dois.
                Exclusivo pros {TOTAL_SPOTS} primeiros inscritos.
              </p>

              <div className="mt-6 rounded-xl border border-accent-primary/30 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 rounded-lg border border-accent-primary/30 bg-accent-primary/15 px-3 py-2 font-display text-4xl font-black text-accent-primary leading-none">
                    25%
                  </div>
                  <div>
                    <div className="font-bold text-text-primary text-lg">OFF no 1º pacote de horas</div>
                    <div className="mt-1 text-sm text-text-secondary">
                      Desconto na primeira visita, válido por 60 dias após a abertura. Começa com tudo.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-accent-secondary/20 bg-accent-secondary/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 rounded-lg bg-accent-secondary/10 px-3 py-2 font-display text-2xl font-black text-accent-secondary">
                    10%
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">OFF vitalício em toda visita</div>
                    <div className="mt-1 text-sm text-text-secondary">
                      Mantendo 4h+ de uso por mês o desconto nunca expira. Só no mínimo já são
                      <span className="font-bold text-accent-secondary"> ~R$120/ano</span> de volta pro seu
                      bolso — pra sempre.
                    </div>
                  </div>
                </div>
              </div>

              <ul className="mt-5 space-y-3">
                {[
                  "Voucher entregue instantaneamente por email",
                  "Acesso a comunidade exclusiva no Discord",
                  "Prioridade na inauguração",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-text-primary">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-secondary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
