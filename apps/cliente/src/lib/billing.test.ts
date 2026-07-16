import { describe, expect, it } from "vitest";
import { computeOpenBillingPreview, formatCents } from "./billing";

const RATES = { vale_cents: 1200, pico_cents: 2500 };

describe("formatCents", () => {
  it("formats cents as BRL with comma decimal separator", () => {
    expect(formatCents(1200)).toBe("R$12,00");
    expect(formatCents(2599)).toBe("R$25,99");
    expect(formatCents(0)).toBe("R$0,00");
  });
});

describe("computeOpenBillingPreview", () => {
  it("charges hora vale entirely within weekday before 18h", () => {
    // Monday 2026-07-13, 10:00 -> 11:00 BRT
    const start = new Date("2026-07-13T10:00:00-03:00");
    const end = new Date("2026-07-13T11:00:00-03:00");
    const { segments, totalCents } = computeOpenBillingPreview(start, end, RATES);

    expect(segments).toHaveLength(1);
    expect(segments[0].rate_type).toBe("hora_vale");
    expect(segments[0].minutes).toBe(60);
    expect(totalCents).toBe(1200);
  });

  it("charges hora pico entirely on a weekday after 18h", () => {
    // Monday 2026-07-13, 20:00 -> 21:00 BRT
    const start = new Date("2026-07-13T20:00:00-03:00");
    const end = new Date("2026-07-13T21:00:00-03:00");
    const { segments, totalCents } = computeOpenBillingPreview(start, end, RATES);

    expect(segments).toHaveLength(1);
    expect(segments[0].rate_type).toBe("hora_pico");
    expect(segments[0].minutes).toBe(60);
    expect(totalCents).toBe(2500);
  });

  it("charges hora pico entirely during the weekend", () => {
    // Saturday 2026-07-18, 10:00 -> 11:00 BRT (weekend, always pico regardless of hour)
    const start = new Date("2026-07-18T10:00:00-03:00");
    const end = new Date("2026-07-18T11:00:00-03:00");
    const { segments, totalCents } = computeOpenBillingPreview(start, end, RATES);

    expect(segments).toHaveLength(1);
    expect(segments[0].rate_type).toBe("hora_pico");
    expect(totalCents).toBe(2500);
  });

  it("splits into vale then pico when crossing the 18h weekday boundary", () => {
    // Monday 2026-07-13, 17:30 -> 18:30 BRT
    const start = new Date("2026-07-13T17:30:00-03:00");
    const end = new Date("2026-07-13T18:30:00-03:00");
    const { segments, totalCents } = computeOpenBillingPreview(start, end, RATES);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ rate_type: "hora_vale", minutes: 30 });
    expect(segments[1]).toMatchObject({ rate_type: "hora_pico", minutes: 30 });

    const expectedTotal = Math.round((RATES.vale_cents * 30) / 60) + Math.round((RATES.pico_cents * 30) / 60);
    expect(totalCents).toBe(expectedTotal);
  });

  it("splits into pico then vale when crossing midnight from Sunday into Monday", () => {
    // Sunday 2026-07-19 23:00 (weekend -> pico) -> Monday 2026-07-20 01:00 (weekday, before 18h -> vale)
    const start = new Date("2026-07-19T23:00:00-03:00");
    const end = new Date("2026-07-20T01:00:00-03:00");
    const { segments, totalCents } = computeOpenBillingPreview(start, end, RATES);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ rate_type: "hora_pico", minutes: 60 });
    expect(segments[1]).toMatchObject({ rate_type: "hora_vale", minutes: 60 });
    expect(totalCents).toBe(RATES.pico_cents + RATES.vale_cents);
  });

  it("merges consecutive same-rate segments across a midnight crossing with no rate change", () => {
    // Friday 2026-07-17 23:30 -> Saturday 2026-07-18 00:30 BRT: both sides are pico
    // (Friday after 18h is pico, Saturday is weekend so also pico) -> should stay a single segment
    const start = new Date("2026-07-17T23:30:00-03:00");
    const end = new Date("2026-07-18T00:30:00-03:00");
    const { segments, totalCents } = computeOpenBillingPreview(start, end, RATES);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ rate_type: "hora_pico", minutes: 60 });
    expect(totalCents).toBe(2500);
  });

  it("returns no segments when start equals end", () => {
    const start = new Date("2026-07-13T10:00:00-03:00");
    const { segments, totalCents } = computeOpenBillingPreview(start, start, RATES);

    expect(segments).toHaveLength(0);
    expect(totalCents).toBe(0);
  });
});
