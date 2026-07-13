import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);
  const [nearForm, setNearForm] = useState(false);

  useEffect(() => {
    const handler = () => {
      setVisible(window.scrollY > 320);
      const form = document.getElementById("form");
      if (form) {
        setNearForm(form.getBoundingClientRect().top < window.innerHeight * 0.75);
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!visible || nearForm) return null;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pt-3 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <a
        href="#form"
        className="flex w-full items-center justify-center gap-2 bg-accent-primary py-4 text-sm font-black uppercase tracking-widest text-text-on-accent"
      >
        Garantir minha vaga — grátis
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
