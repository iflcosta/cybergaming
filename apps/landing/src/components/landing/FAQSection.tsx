import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS } from "./constants";
import { Reveal } from "./Reveal";

export function FAQSection() {
  return (
    <section id="faq" className="bg-bg-secondary px-6 py-16 md:py-32">
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

        <Reveal className="mt-10">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-white/5">
                <AccordionTrigger className="py-5 text-left text-base font-semibold text-text-primary transition-colors hover:text-accent-primary hover:no-underline md:text-lg">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 leading-relaxed text-text-secondary">
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
