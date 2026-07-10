import { createFileRoute, Link } from "@tanstack/react-router";
import { insertLead, getLeadCount } from "@/lib/supabase";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Check,
  Loader2,
  MessageCircle,
  Instagram,
  Zap,
  Shield,
  Cpu,
  Wifi,
  Monitor,
  Users,
  ChevronDown,
  Trophy,
  Clock,
} from "lucide-react";

const TOTAL_SPOTS = 200;
const OPEN_DATE = new Date("2026-09-01T00:00:00-03:00");

const JOGOS = [
  "CS2 (Counter-Strike 2)",
  "Valorant",
  "League of Legends",
  "Free Fire",
  "Rainbow Six Siege",
  "Fortnite",
  "EA FC",
  "Apex Legends",
  "Dota 2",
  "Outro",
] as const;

const FAQ_ITEMS = [
  {
    q: "Quais são os benefícios do Founding Member Club?",
    a: "Dois benefícios permanentes: 25% OFF no seu primeiro pacote de horas (válido por 60 dias após a abertura), mais 10% de desconto vitalício em todas as visitas — desde que você consuma R$60 ou mais por mês na arena.",
  },
  {
    q: "O desconto de 10% vitalício é mesmo para sempre?",
    a: "Sim, enquanto você mantiver o consumo mínimo de R$60/mês na arena. Meses em que ficar abaixo desse valor o desconto fica pausado, mas volta automaticamente quando você retomar.",
  },
  {
    q: "Quando a arena vai abrir?",
    a: "Setembro de 2026. A data exata será anunciada primeiro pra quem tá na lista — você recebe antes de todo mundo.",
  },
  {
    q: "Onde vai funcionar?",
    a: "Em Bragança Paulista, SP. O endereço completo será divulgado próximo da inauguração para quem estiver na lista.",
  },
  {
    q: "Posso transferir meu status de founding member?",
    a: "O voucher de 25% pode ser transferido uma única vez pra um amigo antes do primeiro uso. O desconto vitalício de 10% é pessoal e intransferível.",
  },
  {
    q: "Como cancelo o cadastro?",
    a: "Simples: responde qualquer email nosso com 'sair' ou clica em 'Descadastrar' no rodapé de qualquer email que você receber de nós.",
  },
];

const HARDWARE_SPECS = [
  { icon: Monitor, label: "Monitores", value: "180Hz", sub: "Alta taxa de atualização" },
  { icon: Cpu, label: "GPUs", value: "RX 7600", sub: "Performance de elite" },
  { icon: Wifi, label: "Latência", value: "<10ms", sub: "Fibra dedicada" },
  { icon: Shield, label: "Cadeiras", value: "Pro ergô", sub: "Conforto para longas sessões" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cyber Brasil Arena — Founding Member Club | Bragança Paulista" },
      {
        name: "description",
        content:
          "A maior arena gamer do interior paulista abre em Setembro 2026 em Bragança Paulista. Founding members ganham 25% OFF no 1º pacote + 10% de desconto vitalício. Só 200 vagas.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Cyber Brasil Arena — Founding Member Club" },
      {
        property: "og:description",
        content:
          "25% OFF no 1º pacote + 10% vitalício pra quem gastar R$60+/mês. Hardware de elite chegando a Bragança Paulista em Setembro 2026. Só 200 vagas.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#a855f7" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: LandingPage,
});

function useReveal<T extends HTMLElement = HTMLElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function useLeadCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    getLeadCount().then(setCount);
  }, []);
  return count;
}

function useCountdown(target: Date) {
  const calc = useCallback(() => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }, [target]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

function LandingPage() {
  return (
    <div className="w-full bg-bg-primary text-text-primary selection:bg-accent-primary/30">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-accent-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-on-accent"
      >
        Pular pro conteúdo
      </a>
      <Navbar />
      <main id="hero">
        <Hero />
        <StatsBar />
        <HowItWorks />
        <HardwareSection />
        <VoucherSection />
        <FAQSection />
        <FormSection />
      </main>
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-gradient-to-br from-accent-primary to-accent-secondary">
        <span className="font-display text-xs font-black text-bg-primary tracking-tight">CB</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-text-tertiary">
          Cyber Brasil
        </span>
        <span className="font-display text-base font-black uppercase tracking-tighter text-text-primary">
          Arena<span className="text-accent-primary">.</span>
        </span>
      </div>
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "border-b border-white/5 backdrop-blur-xl" : "border-b border-transparent"
      }`}
      style={{ backgroundColor: scrolled ? "rgba(5,5,8,0.92)" : "transparent" }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden gap-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary md:flex">
          <a href="#arena" className="transition-colors hover:text-text-primary">Arena</a>
          <a href="#hardware" className="transition-colors hover:text-text-primary">Hardware</a>
          <a href="#voucher" className="transition-colors hover:text-text-primary">Voucher</a>
          <a href="#faq" className="transition-colors hover:text-text-primary">FAQ</a>
        </nav>
        <a
          href="#form"
          className="group inline-flex items-center gap-2 border border-accent-primary/50 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-accent-primary transition-all duration-300 hover:bg-accent-primary hover:text-text-on-accent"
        >
          Garantir vaga
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </header>
  );
}

function GlitchText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={`relative inline-block overflow-visible py-3 ${className}`}>
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

function Hero() {
  const countdown = useCountdown(OPEN_DATE);
  const takenSpots = useLeadCount();
  const remaining = takenSpots !== null ? TOTAL_SPOTS - takenSpots : null;

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden px-6 pt-20">
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

        <h1 className="fade-in-up font-display font-black uppercase leading-[1] tracking-tighter overflow-visible" style={{ fontSize: "clamp(2.75rem,9vw,7.5rem)" }}>
          A próxima
          <br />
          <GlitchText className="bg-gradient-to-r from-accent-primary via-purple-400 to-accent-secondary bg-clip-text text-transparent">
            Evolução.
          </GlitchText>
        </h1>

        <p className="fade-in-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary md:mt-8 md:text-xl" style={{ animationDelay: "100ms" }}>
          Hardware de elite, infraestrutura premium, comunidade focada em performance. A experiência
          definitiva em gaming chega ao interior paulista.
        </p>

        <div className="fade-in-up mt-12 flex items-center justify-center gap-4 md:gap-8" style={{ animationDelay: "200ms" }}>
          {[
            { v: countdown.days, label: "dias" },
            { v: countdown.hours, label: "horas" },
            { v: countdown.minutes, label: "min" },
            { v: countdown.seconds, label: "seg" },
          ].map(({ v, label }) => (
            <div key={label} className="flex flex-col items-center">
              <div className="font-mono font-display text-2xl font-black tabular-nums text-accent-primary sm:text-3xl md:text-5xl">
                {String(v).padStart(2, "0")}
              </div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="fade-in-up mt-12 flex flex-col items-center justify-center gap-6 md:flex-row" style={{ animationDelay: "300ms" }}>
          <a
            href="#form"
            className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden bg-accent-primary px-8 py-4 text-xs font-black uppercase tracking-widest text-text-on-accent transition-all duration-300 hover:-translate-y-0.5 hover:glow-primary sm:px-10 sm:py-5 sm:text-sm md:w-auto"
          >
            <span className="relative z-10">Entrar pro Founding Member Club</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </a>

          <div className="flex flex-col items-center gap-1 md:items-start">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-black text-text-primary">
                {takenSpots ?? "—"}
              </span>
              <span className="text-text-tertiary">/</span>
              <span className="text-xl font-medium text-text-tertiary">{TOTAL_SPOTS}</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
              vagas ocupadas · restam{" "}
              <span className="text-accent-tertiary font-bold">
                {remaining ?? "…"}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="scroll-bounce pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:bottom-8">
        <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-text-tertiary">
          Role pra descobrir
        </span>
        <ChevronDown className="h-4 w-4 text-text-tertiary" />
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { icon: Monitor, value: "10", label: "PCs premium" },
    { icon: Users, value: "200", label: "Founding members" },
    { icon: Trophy, value: "Top 1", label: "Setup da região" },
    { icon: Clock, value: "24/7", label: "Suporte técnico" },
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

function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Cadastre-se grátis",
      s: "Entre pra lista exclusiva e garanta sua prioridade na inauguração. Zero custo, zero compromisso.",
    },
    {
      n: "02",
      t: "Receba o voucher",
      s: "Instantaneamente no seu email: 25% OFF na primeira visita + 10% vitalício pra quem jogar R$60+/mês. Tudo junto.",
    },
    {
      n: "03",
      t: "Domine a arena",
      s: "No dia da abertura, você entra com prioridade e usa hardware que a maioria nem sabe que existe.",
    },
  ];

  return (
    <section id="arena" className="px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — Como funciona
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-6xl">
            O caminho do{" "}
            <span className="bg-gradient-to-r from-accent-secondary to-accent-primary bg-clip-text text-transparent">
              Pro
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-lg text-text-secondary">
            Três passos. Sem enrolação. Sem custo. Você só precisa querer ser o primeiro.
          </p>
        </Reveal>

        <div className="mt-20 grid gap-0 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 120}>
              <div className="group relative border border-white/5 p-10 transition-colors hover:border-accent-primary/20 hover:bg-bg-secondary/50">
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

function HardwareSection() {
  return (
    <section id="hardware" className="bg-bg-secondary px-6 py-32">
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

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

        <Reveal className="mt-12" delay={400}>
          <div className="flex items-center gap-3 rounded-xl border border-accent-secondary/20 bg-accent-secondary/5 p-5">
            <Zap className="h-5 w-5 flex-shrink-0 text-accent-secondary" />
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

function VoucherSection() {
  const takenSpots = useLeadCount();
  const remaining = takenSpots !== null ? TOTAL_SPOTS - takenSpots : null;
  const percentFilled = takenSpots !== null ? (takenSpots / TOTAL_SPOTS) * 100 : 0;

  return (
    <section id="voucher" className="px-6 py-32">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-accent-primary/30 bg-bg-secondary p-1">
          <div className="pointer-events-none absolute left-0 top-0 h-16 w-16 border-l-2 border-t-2 border-accent-primary/60" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-16 border-b-2 border-r-2 border-accent-primary/60" />

          <div className="flex flex-col items-stretch gap-0 rounded-xl bg-bg-primary md:flex-row">
            <div className="flex-1 p-8 md:p-14">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-widest text-accent-primary">
                Founding Member Club — {TOTAL_SPOTS} vagas
              </div>
              <h2 className="font-display font-black uppercase leading-tight tracking-tighter" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
                Dois benefícios,
                <br />
                <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                  pra sempre.
                </span>
              </h2>
              <p className="mt-6 text-text-secondary">
                Quem entrar agora não escolhe entre um desconto ou outro — ganha os dois.
                Exclusivo pros {TOTAL_SPOTS} primeiros inscritos.
              </p>

              {/* Benefício 1 */}
              <div className="mt-8 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 rounded-lg bg-accent-primary/10 px-3 py-2 font-display text-2xl font-black text-accent-primary">
                    25%
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">OFF no 1º pacote de horas</div>
                    <div className="mt-1 text-sm text-text-secondary">
                      Desconto na primeira visita, válido por 60 dias após a abertura. Começa com tudo.
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefício 2 */}
              <div className="mt-4 rounded-xl border border-accent-secondary/20 bg-accent-secondary/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 rounded-lg bg-accent-secondary/10 px-3 py-2 font-display text-2xl font-black text-accent-secondary">
                    10%
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">OFF vitalício em toda visita</div>
                    <div className="mt-1 text-sm text-text-secondary">
                      Mantendo R$60+/mês na arena o desconto nunca expira. Quanto mais você joga, mais economiza.
                    </div>
                  </div>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
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

            <div className="hidden w-px bg-white/5 md:block" />
            <div className="block h-px bg-white/5 md:hidden" />

            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center md:w-56 md:p-10">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Vagas restantes</div>
                <div className="mt-2 font-mono font-display text-7xl font-black tabular-nums text-accent-primary leading-none">
                  {remaining ?? "—"}
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">de {TOTAL_SPOTS}</div>
              </div>

              <div className="w-full">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-700"
                    style={{ width: `${percentFilled}%` }}
                  />
                </div>
                <div className="mt-2 text-[10px] text-text-tertiary">{Math.round(percentFilled)}% preenchido</div>
              </div>

              <a
                href="#form"
                className="inline-flex w-full items-center justify-center gap-2 border border-accent-primary/40 px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-accent-primary transition-all hover:bg-accent-primary hover:text-text-on-accent"
              >
                Garantir vaga
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="bg-bg-secondary px-6 py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — Dúvidas
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-5xl">
            Perguntas frequentes
          </h2>
          <p className="mt-4 text-text-secondary">Ficou dúvida? Talvez esteja aqui.</p>
        </Reveal>

        <Reveal className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-white/5">
                <AccordionTrigger className="py-6 text-left text-base font-semibold text-text-primary transition-colors hover:text-accent-primary hover:no-underline md:text-lg">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 leading-relaxed text-text-secondary">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

const ESTILOS_JOGO = [
  { value: "solo", label: "Jogo solo", desc: "Prefiro entrar sozinho e fazer novas amizades" },
  { value: "equipe-fixa", label: "Tenho equipe", desc: "Já tenho time formado" },
  { value: "procurando", label: "Procurando equipe", desc: "Quero encontrar jogadores pra montar time" },
] as const;

const INTERESSES = [
  { value: "competir", label: "Quero competir", desc: "Participar de campeonatos e rankings" },
  { value: "assistir", label: "Quero assistir", desc: "Curtir eventos e transmissões ao vivo" },
  { value: "ambos", label: "Ambos", desc: "Competir e acompanhar o cenário" },
] as const;

function RadioGroup<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  options: readonly { value: T; label: string; desc: string }[];
  value: T | "";
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
        {label}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer flex-col gap-1 border p-4 transition-all ${
              value === opt.value
                ? "border-accent-primary/60 bg-accent-primary/10"
                : "border-white/8 hover:border-white/20"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span className="text-sm font-bold text-text-primary">{opt.label}</span>
            <span className="text-[11px] leading-snug text-text-tertiary">{opt.desc}</span>
          </label>
        ))}
      </div>
      {error && <p className="ml-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FormSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [jogo, setJogo] = useState("");
  const [estilo, setEstilo] = useState<"solo" | "equipe-fixa" | "procurando" | "">("");
  const [interesse, setInteresse] = useState<"competir" | "assistir" | "ambos" | "">("");

  function validate(nome: string, whatsapp: string, email: string) {
    const errs: Record<string, string> = {};
    if (nome.length < 2) errs.nome = "Digita seu nome completo";
    if (whatsapp.replace(/\D/g, "").length < 10) errs.whatsapp = "WhatsApp inválido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email inválido";
    if (!jogo) errs.jogo = "Seleciona seu jogo principal";
    if (!estilo) errs.estilo = "Seleciona seu estilo de jogo";
    if (!interesse) errs.interesse = "Seleciona seu interesse";
    if (!checked) errs.lgpd = "Precisa aceitar pra continuar";
    return errs;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") || "").trim();
    const whatsapp = String(fd.get("whatsapp") || "").trim();
    const email = String(fd.get("email") || "").trim();

    const errs = validate(nome, whatsapp, email);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("loading");
    try {
      await insertLead({
        nome,
        whatsapp,
        email,
        jogo_principal: jogo,
        estilo_jogo: estilo,
        interesse_campeonatos: interesse,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="form" className="px-6 py-32">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
            — Lista exclusiva
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tighter md:text-5xl">
            Garanta seu{" "}
            <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              lugar
            </span>
          </h2>
          <p className="mt-4 text-text-secondary">
            100% gratuito. Sem pagamento. Sem compromisso. Só benefícios.
          </p>
        </Reveal>

        <Reveal className="mt-12">
          {status === "success" ? (
            <div
              className="rounded-xl border border-accent-primary/40 p-10 text-center"
              role="status"
              aria-live="polite"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-accent-primary/30 bg-accent-primary/10">
                <Check className="h-7 w-7 text-accent-primary" />
              </div>
              <h3 className="font-display text-2xl font-black uppercase tracking-tight">
                Você está dentro!
              </h3>
              <p className="mt-3 text-text-secondary">
                Voucher enviado pro seu email. Confere a caixa de entrada{" "}
                <span className="text-text-primary">(e o spam, vai que cola)</span>.
              </p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-accent-primary">
                Bem-vindo ao founding member club.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-8" aria-live="polite">
              {/* Dados básicos */}
              <div className="space-y-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
                  01 — Seus dados
                </div>
                <Field
                  id="nome"
                  label="Nome completo"
                  type="text"
                  placeholder="Como você quer ser chamado"
                  error={errors.nome}
                  autoComplete="name"
                />
                <div className="grid gap-6 md:grid-cols-2">
                  <Field
                    id="whatsapp"
                    label="WhatsApp"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    error={errors.whatsapp}
                    autoComplete="tel"
                  />
                  <Field
                    id="email"
                    label="E-mail"
                    type="email"
                    placeholder="voce@email.com"
                    error={errors.email}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Perfil gamer */}
              <div className="space-y-6 border-t border-white/5 pt-8">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
                  02 — Seu perfil gamer
                </div>

                {/* Jogo principal */}
                <div className="space-y-2">
                  <label
                    htmlFor="jogo"
                    className="ml-1 block text-[10px] font-semibold uppercase tracking-widest text-text-tertiary"
                  >
                    Jogo principal
                  </label>
                  <select
                    id="jogo"
                    value={jogo}
                    onChange={(e) => setJogo(e.target.value)}
                    aria-invalid={!!errors.jogo}
                    className={`w-full border bg-bg-secondary px-5 py-4 text-base text-text-primary transition-colors focus:outline-none ${
                      errors.jogo
                        ? "border-destructive"
                        : "border-white/8 focus:border-accent-primary/60"
                    }`}
                  >
                    <option value="" disabled>Seleciona seu jogo...</option>
                    {JOGOS.map((j) => (
                      <option key={j} value={j} className="bg-bg-secondary">
                        {j}
                      </option>
                    ))}
                  </select>
                  {errors.jogo && (
                    <p className="ml-1 text-xs text-destructive">{errors.jogo}</p>
                  )}
                </div>

                <RadioGroup
                  label="Como você joga?"
                  name="estilo_jogo"
                  options={ESTILOS_JOGO}
                  value={estilo}
                  onChange={setEstilo}
                  error={errors.estilo}
                />

                <RadioGroup
                  label="Interesse em campeonatos e esports?"
                  name="interesse_campeonatos"
                  options={INTERESSES}
                  value={interesse}
                  onChange={setInteresse}
                  error={errors.interesse}
                />
              </div>

              {/* LGPD */}
              <div className="border-t border-white/5 pt-6">
              <label className="flex cursor-pointer items-start gap-3 py-2 text-xs leading-relaxed text-text-tertiary">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 flex-shrink-0 accent-accent-primary"
                  aria-describedby={errors.lgpd ? "lgpd-error" : undefined}
                  aria-invalid={!!errors.lgpd}
                />
                <span>
                  Li e aceito a{" "}
                  <Link to="/privacidade" className="text-accent-primary underline-offset-2 hover:underline">
                    política de privacidade
                  </Link>{" "}
                  e os{" "}
                  <Link to="/termos" className="text-accent-primary underline-offset-2 hover:underline">
                    termos de uso
                  </Link>
                  . Posso cancelar quando quiser.
                </span>
              </label>
              {errors.lgpd && (
                <p id="lgpd-error" className="text-xs text-destructive">{errors.lgpd}</p>
              )}

              {status === "error" && (
                <p className="mt-3 text-sm text-destructive">
                  Erro ao enviar. Tenta de novo ou nos contata pelo WhatsApp.
                </p>
              )}
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden bg-accent-primary px-6 py-5 text-sm font-black uppercase tracking-widest text-text-on-accent transition-all duration-300 hover:brightness-110 hover:glow-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {status === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      Quero entrar pro Founding Member Club
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              </button>

              <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                Dados protegidos pela LGPD · Zero spam · Descadastre quando quiser
              </p>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  type,
  placeholder,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="ml-1 block text-[10px] font-semibold uppercase tracking-widest text-text-tertiary"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full border bg-bg-secondary px-5 py-4 text-base text-text-primary placeholder:text-text-tertiary transition-colors focus:outline-none ${
          error ? "border-destructive" : "border-white/8 focus:border-accent-primary/60"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="ml-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-bg-primary px-6 py-14">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
        <Logo />
        <div className="flex gap-8 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
          <Link to="/privacidade" className="transition-colors hover:text-text-primary">Privacidade</Link>
          <Link to="/termos" className="transition-colors hover:text-text-primary">Termos</Link>
          <a href="mailto:voucher@arena.cyberinformatica.tech" className="transition-colors hover:text-text-primary">Contato</a>
        </div>
        <div className="flex gap-3">
          <a
            href="https://wa.me/5511954369269"
            aria-label="WhatsApp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-text-secondary transition-all hover:border-accent-secondary hover:text-accent-secondary"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <a
            href="https://instagram.com/cyberbrasilarena"
            aria-label="Instagram"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-text-secondary transition-all hover:border-accent-tertiary hover:text-accent-tertiary"
          >
            <Instagram className="h-4 w-4" />
          </a>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/5 pt-8 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
        © 2026 Cyber Brasil Arena · Bragança Paulista, SP · CNPJ em constituição
      </div>
    </footer>
  );
}
