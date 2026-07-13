import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Cyber Brasil Arena" },
      { name: "description", content: "Termos de uso do voucher founding member da Cyber Brasil Arena." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mt-8 text-4xl font-bold md:text-5xl">Termos de Uso</h1>
      <div className="mt-8 space-y-6 leading-relaxed text-text-secondary">
        <p>
          Ao se cadastrar pra receber o voucher founding member da Cyber Brasil Arena, você concorda
          com estes termos.
        </p>
        <h2 className="text-xl font-semibold text-text-primary">Voucher</h2>
        <p>
          O voucher founding member concede 25% de desconto no primeiro pacote de horas, válido por
          60 dias a partir da criação da sua conta no app da arena. Depois de usado (ou expirado),
          founding members mantêm 10% de desconto vitalício em qualquer pacote. Limitado a 200 unidades.
        </p>
        <h2 className="text-xl font-semibold text-text-primary">Transferência</h2>
        <p>
          O voucher pode ser transferido uma única vez pra outra pessoa antes do primeiro uso.
          Depois de utilizado, torna-se intransferível.
        </p>
        <h2 className="text-xl font-semibold text-text-primary">Cancelamento</h2>
        <p>
          Você pode cancelar seu cadastro a qualquer momento respondendo qualquer email nosso com
          "sair" ou pelo link de descadastro no rodapé dos emails.
        </p>
        <h2 className="text-xl font-semibold text-text-primary">Contato</h2>
        <p>
          Dúvidas: voucher@arena.cyberinformatica.tech.
        </p>
      </div>
    </main>
  );
}
