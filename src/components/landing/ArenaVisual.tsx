import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal } from "./Reveal";

const ARENA_IMAGES = [
  { src: "/arena-overview.jpg", alt: "Visão geral da Cyber Brasil Arena — dois times frente a frente" },
  { src: "/arena-gameplay.jpg", alt: "Estação de jogo da Cyber Brasil Arena — perspectiva do jogador" },
];

export function ArenaVisualSection() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? ARENA_IMAGES.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === ARENA_IMAGES.length - 1 ? 0 : c + 1));

  return (
    <section className="overflow-hidden bg-bg-secondary px-6 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-12 text-center">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — O ambiente
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-6xl">
            Cada detalhe <span className="text-accent-primary">importa</span>
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-lg text-text-secondary">
            Equipamento de competição, ambiente climatizado e fibra dedicada. Sem limitações.
          </p>
        </Reveal>

        <Reveal className="relative mx-auto max-w-4xl" delay={100}>
          <div
            className="relative rounded-xl border border-white/10 bg-bg-tertiary p-1.5 overflow-hidden"
            style={{ boxShadow: "0 25px 60px rgba(176,110,247,0.15), 0 0 0 1px rgba(255,255,255,0.04)" }}
          >
            <div className="relative aspect-video overflow-hidden rounded-lg">
              {ARENA_IMAGES.map((img, i) => (
                <img
                  key={img.src}
                  src={img.src}
                  alt={img.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    i === current ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              <button
                onClick={prev}
                aria-label="Imagem anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                aria-label="Próxima imagem"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                {ARENA_IMAGES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Imagem ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === current ? "w-6 bg-accent-primary" : "w-2 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-accent-primary/10 blur-2xl rounded-full" />

          {[
            { label: "180Hz", sub: "Monitor", color: "text-accent-primary", border: "border-accent-primary/30", pos: "-left-24 top-8" },
            { label: "RX 7600", sub: "GPU", color: "text-accent-secondary", border: "border-accent-secondary/30", pos: "-right-24 top-8" },
            { label: "<10ms", sub: "Latência", color: "text-green-400", border: "border-green-500/30", pos: "-left-24 bottom-16" },
            { label: "21°C", sub: "Climatizado", color: "text-text-primary", border: "border-white/10", pos: "-right-24 bottom-16" },
          ].map((tag, i) => (
            <Reveal key={tag.label} delay={200 + i * 80} className={`absolute ${tag.pos} hidden lg:block`}>
              <div className={`border ${tag.border} bg-bg-primary/90 backdrop-blur-sm px-3 py-2 rounded-lg text-center`}>
                <div className={`${tag.color} font-black font-display text-xl`}>{tag.label}</div>
                <div className="text-text-tertiary text-[9px] uppercase tracking-widest mt-0.5">{tag.sub}</div>
              </div>
            </Reveal>
          ))}
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:hidden">
          {[
            { v: "180Hz", l: "Monitor", c: "text-accent-primary", b: "border-accent-primary/20" },
            { v: "RX 7600", l: "GPU", c: "text-accent-secondary", b: "border-accent-secondary/20" },
            { v: "<10ms", l: "Latência", c: "text-green-400", b: "border-green-500/20" },
            { v: "21°C", l: "Climatizado", c: "text-text-primary", b: "border-white/10" },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 60}>
              <div className={`border ${s.b} bg-bg-primary rounded-lg px-4 py-4 text-center`}>
                <div className={`${s.c} font-black font-display text-2xl`}>{s.v}</div>
                <div className="mt-1 text-text-tertiary text-[10px] uppercase tracking-widest">{s.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
