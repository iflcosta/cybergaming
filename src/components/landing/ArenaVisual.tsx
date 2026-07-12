import { Reveal } from "./Reveal";

export function ArenaVisualSection() {
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

        <Reveal className="relative mx-auto max-w-2xl" delay={100}>
          {/* Monitor frame */}
          <div
            className="relative rounded-xl border border-white/10 bg-bg-tertiary p-1.5"
            style={{ boxShadow: "0 25px 60px rgba(176,110,247,0.15), 0 0 0 1px rgba(255,255,255,0.04)" }}
          >
            {/* Screen */}
            <div className="relative aspect-video overflow-hidden rounded-lg bg-bg-primary">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/10 via-bg-primary to-accent-secondary/10" />
              <div className="absolute inset-0 hero-grid opacity-25" />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)",
                }}
              />

              {/* HUD */}
              <div className="absolute inset-3 sm:inset-5 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] sm:text-[9px] font-mono uppercase tracking-widest text-text-tertiary w-6">HP</span>
                      <div className="h-1 sm:h-1.5 w-16 sm:w-24 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-green-500 to-emerald-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] sm:text-[9px] font-mono uppercase tracking-widest text-text-tertiary w-6">SH</span>
                      <div className="h-1 sm:h-1.5 w-12 sm:w-20 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-accent-secondary to-cyan-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[8px] sm:text-[10px] text-green-400/80">8 MS</span>
                    <span className="font-mono text-[8px] sm:text-[10px] text-accent-secondary/80">240 FPS</span>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative w-6 h-6 sm:w-9 sm:h-9">
                    <div className="absolute top-1/2 w-full h-px bg-accent-secondary/50" />
                    <div className="absolute left-1/2 h-full w-px bg-accent-secondary/50" />
                    <div className="absolute inset-[25%] rounded-full border border-accent-secondary/40" />
                    <div className="absolute inset-[44%] rounded-full bg-accent-secondary/70" />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded border flex items-center justify-center ${
                          i === 1
                            ? "border-accent-primary/60 bg-accent-primary/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span className="text-[7px] sm:text-[9px] font-mono text-text-tertiary">{i}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[8px] sm:text-[10px] text-text-tertiary">ROUND 12</div>
                    <div className="font-display font-black text-base sm:text-xl text-text-primary">
                      <span className="text-accent-secondary">12</span>
                      <span className="text-text-tertiary mx-1">:</span>
                      <span className="text-destructive">8</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="pointer-events-none absolute inset-0 rounded-lg"
                style={{ boxShadow: "inset 0 0 60px rgba(176,110,247,0.07)" }}
              />
            </div>
          </div>

          {/* Monitor stand */}
          <div className="mx-auto flex flex-col items-center">
            <div className="w-16 h-3 bg-bg-tertiary rounded-b-sm" />
            <div className="w-28 h-1.5 bg-white/5 rounded-sm" />
          </div>

          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-accent-primary/10 blur-2xl rounded-full" />

          {/* Floating spec tags — desktop only */}
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

        {/* Mobile spec chips */}
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
