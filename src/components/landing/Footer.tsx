import { Link } from "@tanstack/react-router";
import { MessageCircle, Instagram } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-bg-primary px-6 py-14">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
        <Logo />
        <div className="flex gap-8 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
          <Link to="/sobre" className="transition-colors hover:text-text-primary">Sobre</Link>
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
            href="https://instagram.com/cybergg.arena"
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
