import { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { NAV_LINKS } from "./constants";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled || menuOpen
          ? "border-b border-white/5 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
      style={{ backgroundColor: scrolled || menuOpen ? "rgba(5,5,8,0.95)" : "transparent" }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden gap-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-text-primary">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://app.arena.cyberinformatica.tech"
            className="hidden md:inline-flex items-center text-[11px] font-semibold uppercase tracking-widest text-text-tertiary transition-colors hover:text-text-primary"
          >
            Já é membro? Entrar
          </a>
          <a
            href="#form"
            className="group hidden md:inline-flex items-center gap-2 border border-accent-primary/50 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-accent-primary transition-all duration-300 hover:bg-accent-primary hover:text-text-on-accent"
          >
            Garantir vaga
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex h-11 w-11 items-center justify-center border border-white/10 text-text-secondary transition-colors hover:border-accent-primary/40 hover:text-accent-primary"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-1 px-6 pb-8 pt-2">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={close}
              className="border-b border-white/5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-text-secondary transition-colors hover:text-text-primary"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#form"
            onClick={close}
            className="mt-5 flex items-center justify-center gap-2 bg-accent-primary py-4 text-sm font-black uppercase tracking-widest text-text-on-accent"
          >
            Garantir minha vaga — grátis
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="https://app.arena.cyberinformatica.tech"
            onClick={close}
            className="mt-3 flex items-center justify-center py-3 text-xs font-semibold uppercase tracking-widest text-text-tertiary"
          >
            Já é membro? Entrar
          </a>
        </nav>
      </div>
    </header>
  );
}
