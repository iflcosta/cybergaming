import { Monitor, Cpu, MemoryStick, HardDrive, Mouse, Headphones, Keyboard, Wind } from "lucide-react";
import { Reveal } from "./Reveal";

const SETUP_SPECS = [
  { icon: Cpu, label: "Processador", value: "AMD Ryzen 5 5600", detail: "6 cores / 12 threads" },
  { icon: MemoryStick, label: "GPU", value: "RX 7600 8GB", detail: "RDNA 3 — ultra em qualquer título" },
  { icon: HardDrive, label: "RAM", value: "16GB DDR4", detail: "3200MHz dual-channel" },
  { icon: Monitor, label: "Monitor", value: "27\" 180Hz", detail: "IPS · 1ms · FreeSync" },
  { icon: Keyboard, label: "Teclado", value: "Mecânico RGB", detail: "Switch red — low profile" },
  { icon: Mouse, label: "Mouse", value: "Gamer 16000 DPI", detail: "Sensor óptico — 6 botões" },
  { icon: Headphones, label: "Headset", value: "Over-ear 7.1", detail: "Microfone retrátil" },
  { icon: Wind, label: "Ambiente", value: "21°C", detail: "Climatizado + fibra dedicada" },
];

export function SetupSection() {
  return (
    <section id="setup" className="bg-bg-secondary px-6 py-16 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal className="text-center">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — Nosso Setup
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-6xl">
            Cada estação, <span className="text-accent-primary">um arsenal</span>
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-lg text-text-secondary">
            10 máquinas idênticas. Zero vantagem por posição. O diferencial é você.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SETUP_SPECS.map((spec, i) => (
            <Reveal key={spec.label} delay={i * 60}>
              <div className="group flex items-start gap-4 rounded-xl border border-white/5 bg-bg-primary p-5 transition-all duration-300 hover:border-accent-primary/20 hover:-translate-y-0.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors group-hover:border-accent-primary/30 group-hover:bg-accent-primary/10">
                  <spec.icon className="h-5 w-5 text-text-tertiary transition-colors group-hover:text-accent-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                    {spec.label}
                  </div>
                  <div className="mt-0.5 font-display text-lg font-black text-text-primary">
                    {spec.value}
                  </div>
                  <div className="mt-0.5 text-xs text-text-secondary">{spec.detail}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
