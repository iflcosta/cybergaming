import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Cyber Brasil Arena" },
      { name: "description", content: "Como a Cyber Brasil Arena trata seus dados pessoais em conformidade com a LGPD." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mt-8 text-4xl font-bold md:text-5xl">Política de Privacidade</h1>
      <div className="mt-8 space-y-6 leading-relaxed text-text-secondary">
        <p>
          A Cyber Brasil Arena respeita sua privacidade e segue a Lei Geral de Proteção de Dados
          (LGPD, Lei 13.709/2018). Esta política explica como coletamos, usamos e protegemos seus dados.
        </p>
        <h2 className="text-xl font-semibold text-text-primary">Dados que coletamos</h2>
        <p>
          Nome, WhatsApp e email — informados por você no formulário de voucher founding member.
          Não coletamos dados sensíveis, não usamos cookies de rastreamento de terceiros.
        </p>
        <h2 className="text-xl font-semibold text-text-primary">Como usamos</h2>
        <p>
          Exclusivamente pra enviar seu voucher, avisar sobre a abertura da arena e novidades
          relacionadas. Não vendemos nem compartilhamos com terceiros.
        </p>
        <h2 className="text-xl font-semibold text-text-primary">Seus direitos</h2>
        <p>
          Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
          enviando email pra voucher@arena.cyberinformatica.tech.
        </p>
      </div>
    </main>
  );
}
