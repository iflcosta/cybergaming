export type UserRole = "customer" | "staff" | "admin";
export type PackageType = "hora_vale" | "hora_pico" | "pacote_3h" | "corujao";
export type SessionStatus = "active" | "completed" | "cancelled";
export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "credits" | "cash";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  role: UserRole;
  is_founding_member: boolean;
  credits_balance: number;
  created_at: string;
  updated_at: string;
}

export interface PcStation {
  id: string;
  station_number: number;
  label: string | null;
  is_active: boolean;
  specs: {
    cpu?: string;
    gpu?: string;
    ram?: string;
    monitor?: string;
    peripherals?: { keyboard?: string; mouse?: string; headset?: string };
  } | null;
  created_at: string;
}

export interface Session {
  id: string;
  customer_id: string | null;
  station_id: string;
  package_type: PackageType | null;
  started_at: string;
  ended_at: string | null;
  planned_end_at: string | null;
  status: SessionStatus;
  price_cents: number;
  transaction_id: string | null;
  created_at: string;
  customer?: Profile;
  station?: PcStation;
}

export interface BillingSegment {
  rate_type: "hora_vale" | "hora_pico";
  minutes: number;
  amount_cents: number;
}

/** Compute a live billing preview for an open (null package_type) session. */
export function computeOpenBillingPreview(
  startedAt: Date,
  endAt: Date = new Date(),
  rates: { vale_cents: number; pico_cents: number } = { vale_cents: 1200, pico_cents: 1500 },
): { segments: BillingSegment[]; totalCents: number } {
  const TZ = "America/Sao_Paulo";
  const segments: BillingSegment[] = [];
  let cursor = new Date(startedAt);
  let totalCents = 0;

  while (cursor < endAt) {
    const localDate = new Date(cursor.toLocaleString("en-US", { timeZone: TZ }));
    const dow  = localDate.getDay();   // 0=Sun, 6=Sat
    const hour = localDate.getHours();

    let rateType: "hora_vale" | "hora_pico";
    let rateCents: number;
    let boundary: Date;

    if (dow >= 1 && dow <= 5 && hour < 18) {
      rateType  = "hora_vale";
      rateCents = rates.vale_cents;
      // Next boundary: 18:00 same day BRT
      const b = new Date(cursor.toLocaleString("en-US", { timeZone: TZ }));
      b.setHours(18, 0, 0, 0);
      boundary = new Date(b.toLocaleString("en-US", { timeZone: "UTC" }) + " UTC");
      // Simpler: compute offset
      const offsetMs = cursor.getTime() - localDate.getTime();
      const localBoundary = new Date(localDate);
      localBoundary.setHours(18, 0, 0, 0);
      boundary = new Date(localBoundary.getTime() + offsetMs);
    } else {
      rateType  = "hora_pico";
      rateCents = rates.pico_cents;
      // Next boundary: midnight next day BRT
      const offsetMs = cursor.getTime() - localDate.getTime();
      const localBoundary = new Date(localDate);
      localBoundary.setDate(localBoundary.getDate() + 1);
      localBoundary.setHours(0, 0, 0, 0);
      boundary = new Date(localBoundary.getTime() + offsetMs);
    }

    if (boundary > endAt) boundary = endAt;

    const segMinutes = Math.max(1, Math.ceil((boundary.getTime() - cursor.getTime()) / 60_000));
    const segAmount  = Math.round((rateCents * segMinutes) / 60);

    const last = segments[segments.length - 1];
    if (last && last.rate_type === rateType) {
      last.minutes      += segMinutes;
      last.amount_cents += segAmount;
    } else {
      segments.push({ rate_type: rateType, minutes: segMinutes, amount_cents: segAmount });
    }

    totalCents += segAmount;
    cursor = boundary;
  }

  return { segments, totalCents };
}

export interface Transaction {
  id: string;
  customer_id: string;
  amount_cents: number;
  type: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
  customer?: Profile;
}

export const PACKAGES: Record<PackageType, { label: string; price_cents: number; duration_min: number; detail: string; founding_price_cents?: number }> = {
  hora_vale:  { label: "Hora Vale",  price_cents: 1200, duration_min: 60,  detail: "Seg–Sex até 18h" },
  hora_pico:  { label: "Hora Pico",  price_cents: 1500, duration_min: 60,  detail: "Pico e fins de semana" },
  pacote_3h:  { label: "Pacote 3h",  price_cents: 4990, duration_min: 180, detail: "Popular ⭐", founding_price_cents: 3900 },
  corujao:    { label: "Corujão",    price_cents: 7990, duration_min: 480, detail: "Sex/Sáb · 22h–06h" },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix:         "PIX",
  credit_card: "Cartão de Crédito",
  debit_card:  "Cartão de Débito",
  credits:     "Créditos",
  cash:        "Dinheiro",
};

export function formatCents(cents: number) {
  return `R$${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${m}min` : `${h}h`;
}
