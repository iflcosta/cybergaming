import { useState, useEffect } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useCountdown } from "./hooks";
import { OPEN_DATE } from "./constants";
import { Reveal } from "./Reveal";

function GlitchText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={`relative inline-block overflow-hidden py-3 ${className}`}>
      <span className="relative z-10">{children}</span>
      <span className="glitch-layer-1 pointer-events-none absolute inset-x-0 inset-y-0 opacity-80" aria-hidden>
        {children}
      </span>
      <span className="glitch-layer-2 pointer-events-none absolute inset-x-0 inset-y-0 opacity-80" aria-hidden>
        {children}
      </span>
    </span>
  );
}

export function Hero() {
  const countdown = useCountdown(OPEN_DATE);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const handler = () => setHintVisible(window.scrollY < 80);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden px-6 pt-20 pb-24 md:pb-0">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-50" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 left-1/4 h-[300px] w-[300px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(244,63,94,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
        <div className="fade-in-up mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-primary/5 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-accent-secondary sm:gap-2.5 sm:px-4 sm:text-[10px] sm:tracking-[0.2em]">
          <span className="relative flex h-2 w-2">
            <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent-secondary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-secondary" />
          </span>
          Abertura Setembro 2026 · Bragança Paulista, SP
        </div>

        <h1
          className="fade-in-up font-display font-black uppercase leading-[1] tracking-tighter"
          style={{ fontSize: "clamp(2.75rem,9vw,7.5rem)" }}
        >
          Hardware de elite.
          <br />
          <GlitchText className="bg-gradient-to-r from-accent-primary via-purple-400 to-accent-secondary bg-clip-text text-transparent">
            Aqui em Bragança.
          </GlitchText>
        </h1>

        <p
          className="fade-in-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary md:mt-8 md:text-xl"
          style={{ animationDelay: "100ms" }}
        >
          O point de CS2, Valorant e LoL competitivo do interior paulista — PCs de ponta, ping baixo
          e uma comunidade que joga sério.
        </p>

        {/* Countdown */}
        <div
          className="fade-in-up mt-10 flex items-center justify-center gap-3 sm:gap-6 md:gap-8"
          style={{ animationDelay: "200ms" }}
        >
          {[
            { v: countdown.days, label: "dias" },
            { v: countdown.hours, label: "horas" },
            { v: countdown.minutes, label: "min" },
            { v: countdown.seconds, label: "seg" },
          ].map(({ v, label }) => (
            <div key={label} className="flex flex-col items-center">
              <div
                className="font-mono font-display font-black tabular-nums text-accent-primary text-3xl sm:text-4xl md:text-5xl"
                suppressHydrationWarning
              >
                {countdown.hydrated ? String(v).padStart(2, "0") : "--"}
              </div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA + spot counter */}
        <div
          className="fade-in-up mt-10 flex flex-col items-center justify-center gap-5 md:flex-row"
          style={{ animationDelay: "300ms" }}
        >
          <a
            href="#form"
            className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden bg-accent-primary px-8 py-4 text-xs font-black uppercase tracking-widest text-text-on-accent transition-all duration-300 hover:-translate-y-0.5 hover:glow-primary sm:px-10 sm:py-5 sm:text-sm md:w-auto"
          >
            <span className="relative z-10">Garantir minha vaga agora</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </a>

          <div className="flex flex-col items-center gap-1 md:items-start">
            <span className="font-display text-lg font-black text-accent-primary">Vagas limitadas</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
              seu voucher de 25% expira 60 dias após a abertura
            </span>
          </div>
        </div>
      </div>

      <div
        className={`scroll-bounce pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500 md:bottom-8 ${
          hintVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-text-tertiary">
          Role pra descobrir
        </span>
        <ChevronDown className="h-4 w-4 text-text-tertiary" />
      </div>
    </section>
  );
}
