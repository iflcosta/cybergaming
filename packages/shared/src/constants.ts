// Pricing (BRL cents to avoid float errors)
export const PRICES = {
  hora_vale: 1200,   // R$12,00
  hora_pico: 1500,   // R$15,00
  pacote_3h: 3900,   // R$39,00
  corujao: 7990,     // R$79,90
} as const;

// Arena operating hours
export const HOURS = {
  open: 10,   // 10h
  close: 22,  // 22h
  corujao_start: 22,
  corujao_end: 6,
} as const;

// Peak hours: 18h–22h Mon–Fri, all day Sat/Sun
export const PEAK_DAYS = [0, 6] as const; // Sunday, Saturday
export const PEAK_HOUR_START = 18;

// Tournament
export const TOURNAMENT = {
  monthly_fee_cents: 15000,        // R$150/team
  infrastructure_cut_cents: 5000, // R$50 → arena costs
  prize_pool_cents: 10000,         // R$100 → prize pool
  monthly_prizes: {
    first:  { cash: 30000, packages: 10, credits: 50000 },
    second: { cash: 20000, packages: 5,  credits: 25000 },
    third:  { cash: 10000, packages: 5,  credits: 0 },
  },
  quarterly_prizes: {
    first:  { cash: 90000, packages: 15, credits: 75000 },
    second: { cash: 60000, packages: 10, credits: 50000 },
    third:  { cash: 30000, packages: 5,  credits: 25000 },
  },
} as const;

export const ARENA_NAME = "Cyber Brasil Arena";
export const ARENA_URL = "arena.cyberinformatica.tech";
export const ARENA_CITY = "Bragança Paulista, SP";
