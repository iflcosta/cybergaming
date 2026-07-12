import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://scrswxgvlwfndsqrclgb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjcnN3eGd2bHdmbmRzcXJjbGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTAwOTMsImV4cCI6MjA5OTI2NjA5M30.IHBXpiLtw2cLgbUWfbuNUs2-oN8H9zSggwFxLgdUM-Y";

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
  jogo_principal: string;
  estilo_jogo: string;
  interesse_campeonatos: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}) {
  const { error } = await supabase.from("leads").insert(payload);
  if (error) throw error;
}
