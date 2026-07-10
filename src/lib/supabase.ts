import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://keeikqvcgegywlzogvwh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ASW_Fvf7CmOsaj3cr08mpA_Q2TFfqUu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function insertLead(nome: string, whatsapp: string, email: string) {
  const { error } = await supabase
    .from("leads")
    .insert({ nome, whatsapp, email });
  if (error) throw error;
}
