import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
