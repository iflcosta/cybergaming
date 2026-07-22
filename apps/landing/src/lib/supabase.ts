import { createClient } from "@supabase/supabase-js";

// Fallback keeps the site up if VITE_SUPABASE_* isn't set in the deploy environment.
// The anon key is public by design (safe to ship in client bundles) — this is not a secret.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "https://scrswxgvlwfndsqrclgb.supabase.co";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjcnN3eGd2bHdmbmRzcXJjbGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTAwOTMsImV4cCI6MjA5OTI2NjA5M30.IHBXpiLtw2cLgbUWfbuNUs2-oN8H9zSggwFxLgdUM-Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getLeadCount(): Promise<number | null> {
  const { data, error } = await supabase.rpc("get_lead_count");
  if (error) return null;
  return Number(data) || 0;
}

export async function insertLead(payload: {
  nome: string;
  whatsapp: string;
  email: string;
  jogo_principal: string | null;
  estilo_jogo: string | null;
  interesse_campeonatos: string | null;
  lgpd_aceito: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}) {
  const { error } = await supabase.from("leads").insert(payload);
  if (error) throw error;
}
