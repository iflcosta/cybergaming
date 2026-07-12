import { createFileRoute } from "@tanstack/react-router";
import { FAQ_ITEMS } from "@/components/landing/constants";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { StatsBar } from "@/components/landing/StatsBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ArenaVisualSection } from "@/components/landing/ArenaVisual";
import { HardwareSection } from "@/components/landing/HardwareSection";
import { VoucherSection } from "@/components/landing/VoucherSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FormSection } from "@/components/landing/FormSection";
import { Footer } from "@/components/landing/Footer";
import { StickyMobileCTA } from "@/components/landing/StickyMobileCTA";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cyber Brasil Arena — Hardware de elite. Aqui em Bragança." },
      {
        name: "description",
        content:
          "A arena gamer que Bragança Paulista nunca teve. Founding members ganham 25% OFF no 1º pacote + 10% vitalício. Abertura Setembro 2026. Só 200 vagas.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Cyber Brasil Arena — Hardware de elite. Aqui em Bragança." },
      {
        property: "og:description",
        content:
          "Founding members nunca pagam preço cheio: 25% OFF na 1ª visita + 10% vitalício. Abertura Setembro 2026. Só 200 vagas.",
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
        <ArenaVisualSection />
        <HardwareSection />
        <VoucherSection />
        <FAQSection />
        <FormSection />
      </main>
      <Footer />
      <StickyMobileCTA />
      <WhatsAppButton />
    </div>
  );
}
