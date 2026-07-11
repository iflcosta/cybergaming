import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://keeikqvcgegywlzogvwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZWlrcXZjZ2VneXdsem9ndndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTA1NjgsImV4cCI6MjA5OTI4NjU2OH0.fGqoe_ue6jUkj-O3FnDE2FYzHHdvbGcl-00oZTEg4rs";

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
}) {
  const { error } = await supabase.from("leads").insert(payload);
  if (error) throw error;
}
