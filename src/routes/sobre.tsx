import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Target, Users, Trophy, MapPin } from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Cyber Brasil Arena" },
      { name: "description", content: "Conheça a história, missão e equipe por trás da Cyber Brasil Arena em Bragança Paulista." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <Link
          to="/"
          className="mb-12 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar pra home
        </Link>

        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-secondary">
          — Sobre nós
        </div>
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter md:text-6xl">
          A arena que Bragança{" "}
          <span className="text-accent-primary">merece</span>
        </h1>

        <div className="mt-10 space-y-6 text-lg leading-relaxed text-text-secondary">
          <p>
            A <span className="font-semibold text-text-primary">Cyber Brasil Arena</span> nasceu
            de uma constatação simples: Bragança Paulista tem milhares de gamers, mas nenhum
            lugar digno pra jogar. Sem arena, sem campeonato local, sem comunidade presencial.
          </p>
          <p>
            Decidimos mudar isso. Estamos construindo um espaço de{" "}
            <span className="font-semibold text-text-primary">140m²</span> com 10 estações de
            competição, cada uma com hardware de ponta: RX 7600, monitores 180Hz, periféricos
            de alto padrão e fibra dedicada com menos de 10ms de latência.
          </p>
          <p>
            Mas a Cyber Brasil Arena não é só hardware. É sobre criar uma{" "}
            <span className="font-semibold text-text-primary">comunidade</span>. Um lugar onde
            times se formam, rivalidades saudáveis nascem e o cenário competitivo de Bragança
            finalmente ganha um palco.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {[
            {
              icon: Target,
              title: "Missão",
              text: "Democratizar o acesso a hardware de competição e criar o primeiro ecossistema gamer presencial de Bragança Paulista.",
            },
            {
              icon: Users,
              title: "Comunidade",
              text: "Times de society gamer, campeonatos locais, corujões de sexta e sábado. A arena é o ponto de encontro.",
            },
            {
              icon: Trophy,
              title: "Competição",
              text: "Rankings mensais, torneios semanais e a oportunidade de representar Bragança no cenário regional.",
            },
            {
              icon: MapPin,
              title: "Localização",
              text: "Bragança Paulista, SP. Endereço exato será revelado aos founding members antes da inauguração em Setembro/2026.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/5 bg-bg-secondary p-6"
            >
              <item.icon className="h-6 w-6 text-accent-primary" />
              <h3 className="mt-3 font-display text-lg font-black text-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-8 text-center">
          <h3 className="font-display text-2xl font-black text-text-primary">
            Quer fazer parte da história?
          </h3>
          <p className="mt-2 text-text-secondary">
            Os primeiros 200 inscritos ganham benefícios exclusivos como founding members.
          </p>
          <Link
            to="/"
            hash="form"
            className="mt-6 inline-flex items-center gap-2 bg-accent-primary px-8 py-3 text-sm font-black uppercase tracking-widest text-text-on-accent transition-opacity hover:opacity-90"
          >
            Garantir minha vaga
          </Link>
        </div>
      </div>
    </div>
  );
}
