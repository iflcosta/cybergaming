import { Monitor, Cpu, Wifi, Shield } from "lucide-react";

export const TOTAL_SPOTS = 200;
export const OPEN_DATE = new Date("2026-09-01T00:00:00-03:00");

export const JOGOS = [
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

export const FAQ_ITEMS = [
  { q: "Quanto custa pra entrar na lista?", a: "Nada. A inscrição é 100% gratuita. Você não paga nada pra garantir sua vaga e receber o voucher de founding member." },
  { q: "O que eu ganho como founding member?", a: "25% OFF no primeiro pacote de horas + 10% vitalício em tudo (exceto snacks e bebidas) enquanto mantiver frequência de R$60+/mês." },
  { q: "Quando a arena abre?", a: "Previsão para Setembro de 2026. Founding members recebem acesso prioritário no dia da inauguração." },
  { q: "Precisa ter PC? Precisa levar algo?", a: "Nada. Nossos 10 PCs têm tudo: periféricos de alto padrão inclusos. É só sentar e jogar." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Você pode sair da lista a qualquer momento, sem custo, sem burocracia. Seus dados ficam protegidos pela LGPD." },
] as const;

export const HARDWARE_SPECS = [
  { icon: Monitor, value: "180Hz", label: "Monitor", sub: "Taxa de atualização que elimina ghosting e tearing" },
  { icon: Cpu, value: "RX 7600", label: "GPU", sub: "Performance pra rodar qualquer título em ultra" },
  { icon: Wifi, value: "<10ms", label: "Latência", sub: "Fibra dedicada exclusiva pra arena" },
  { icon: Shield, value: "21°C", label: "Climatizado", sub: "Ar-condicionado em todo o espaço" },
] as const;

export const NAV_LINKS = [
  { href: "#arena", label: "Arena" },
  { href: "#hardware", label: "Hardware" },
  { href: "#voucher", label: "Voucher" },
  { href: "#faq", label: "FAQ" },
] as const;

export const ESTILOS_JOGO = [
  { value: "solo", label: "Jogo solo", desc: "Prefiro entrar sozinho e fazer novas amizades" },
  { value: "equipe-fixa", label: "Tenho equipe", desc: "Já tenho time formado" },
  { value: "procurando", label: "Procurando equipe", desc: "Quero encontrar jogadores pra montar time" },
] as const;

export const INTERESSES = [
  { value: "competir", label: "Quero competir", desc: "Participar de campeonatos e rankings" },
  { value: "assistir", label: "Quero assistir", desc: "Curtir eventos e transmissões ao vivo" },
  { value: "ambos", label: "Ambos", desc: "Competir e acompanhar o cenário" },
] as const;
