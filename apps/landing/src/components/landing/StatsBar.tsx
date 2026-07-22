import { Monitor, Users, Zap, Clock } from "lucide-react";
import { Reveal } from "./Reveal";

export function StatsBar() {
  const stats = [
    { icon: Monitor, value: "10", label: "PCs premium" },
    { icon: Users, value: "200", label: "Vagas founding member" },
    { icon: Zap, value: "<10ms", label: "Latência" },
    { icon: Clock, value: "Set/26", label: "Abertura" },
  ];

  return (
    <div className="border-y border-white/5 bg-bg-secondary">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/5 md:grid-cols-4 md:divide-y-0">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 80} className="flex flex-col items-center gap-2 px-8 py-8">
            <s.icon className="h-5 w-5 text-accent-primary/60" />
            <span className="font-display text-3xl font-black text-text-primary">{s.value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">{s.label}</span>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
