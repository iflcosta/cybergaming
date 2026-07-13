import { createClient } from "@supabase/supabase-js";

// Fallback to the public anon key if the build didn't bake env vars in (it's public by design, not a secret).
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) || "https://scrswxgvlwfndsqrclgb.supabase.co";
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjcnN3eGd2bHdmbmRzcXJjbGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTAwOTMsImV4cCI6MjA5OTI2NjA5M30.IHBXpiLtw2cLgbUWfbuNUs2-oN8H9zSggwFxLgdUM-Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export interface HeartbeatSession {
  id: string;
  status: string;
  started_at: string;
  planned_end_at: string | null;
  package_type: string | null;
}

export async function pairAgent(code: string) {
  const { data, error } = await supabase.rpc("pair_agent", { p_code: code });
  if (error) throw error;
  return data as
    | { ok: true; station_id: string; station_number: number; label: string | null; agent_secret: string }
    | { ok: false; error: string };
}

export async function heartbeat(stationId: string, agentSecret: string) {
  const { data, error } = await supabase.rpc("agent_heartbeat", {
    p_station_id: stationId,
    p_agent_secret: agentSecret,
  });
  if (error) throw error;
  return data as { ok: true; session: HeartbeatSession | null } | { ok: false; error: string };
}
