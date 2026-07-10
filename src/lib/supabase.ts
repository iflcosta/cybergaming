import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://scrswxgvlwfndsqrclgb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjcnN3eGd2bHdmbmRzcXJjbGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTAwOTMsImV4cCI6MjA5OTI2NjA5M30.IHBXpiLtw2cLgbUWfbuNUs2-oN8H9zSggwFxLgdUM-Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function insertLead(nome: string, whatsapp: string, email: string) {
  const { error } = await supabase
    .from("leads")
    .insert({ nome, whatsapp, email });
  if (error) throw error;
}
