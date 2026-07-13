export interface BillingSegment {
  rate_type: "hora_vale" | "hora_pico";
  minutes: number;
  amount_cents: number;
}

export function formatCents(cents: number) {
  return `R$${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/** Live cost estimate for an open (null package_type) session — mirrors close_open_session. */
export function computeOpenBillingPreview(
  startedAt: Date,
  endAt: Date,
  rates: { vale_cents: number; pico_cents: number },
): { segments: BillingSegment[]; totalCents: number } {
  const TZ = "America/Sao_Paulo";
  const segments: BillingSegment[] = [];
  let cursor = new Date(startedAt);
  let totalCents = 0;

  while (cursor < endAt) {
    const localDate = new Date(cursor.toLocaleString("en-US", { timeZone: TZ }));
    const dow  = localDate.getDay();
    const hour = localDate.getHours();
    const offsetMs = cursor.getTime() - localDate.getTime();

    let rateType: "hora_vale" | "hora_pico";
    let rateCents: number;
    const localBoundary = new Date(localDate);

    if (dow >= 1 && dow <= 5 && hour < 18) {
      rateType  = "hora_vale";
      rateCents = rates.vale_cents;
      localBoundary.setHours(18, 0, 0, 0);
    } else {
      rateType  = "hora_pico";
      rateCents = rates.pico_cents;
      localBoundary.setDate(localBoundary.getDate() + 1);
      localBoundary.setHours(0, 0, 0, 0);
    }

    let boundary = new Date(localBoundary.getTime() + offsetMs);
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
