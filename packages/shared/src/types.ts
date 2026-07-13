import { z } from "zod";

// ── Pricing ─────────────────────────────────────────────────────────────────
export const PackageType = z.enum([
  "hora_vale",    // R$12/h off-peak Mon-Thu until 18h
  "hora_pico",   // R$15/h peak
  "pacote_3h",   // R$39 (R$13/h) — Popular
  "corujao",     // R$79,90 Fri/Sat 22h-06h
]);
export type PackageType = z.infer<typeof PackageType>;

// ── Sessions ─────────────────────────────────────────────────────────────────
export const SessionStatus = z.enum(["active", "completed", "cancelled"]);
export type SessionStatus = z.infer<typeof SessionStatus>;

// ── Tournaments ───────────────────────────────────────────────────────────────
export const TournamentType = z.enum(["monthly", "quarterly"]);
export type TournamentType = z.infer<typeof TournamentType>;

export const TournamentStatus = z.enum([
  "registration_open",
  "registration_closed",
  "in_progress",
  "completed",
  "cancelled",
]);
export type TournamentStatus = z.infer<typeof TournamentStatus>;

// ── User roles ────────────────────────────────────────────────────────────────
export const UserRole = z.enum(["customer", "staff", "admin"]);
export type UserRole = z.infer<typeof UserRole>;
