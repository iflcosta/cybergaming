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

export interface AgentPackage {
  code: string;
  label: string;
  price_cents: number;
  duration_min: number;
}

// hora_vale/hora_pico are auto-applied billing rates for open sessions, not
// standalone products a customer can pick regardless of time of day.
const FIXED_PACKAGE_CODES = new Set(["pacote_3h", "corujao"]);

export async function fetchPackages(): Promise<AgentPackage[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("code,label,price_cents,duration_min")
    .eq("is_active", true)
    .in("code", Array.from(FIXED_PACKAGE_CODES))
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AgentPackage[];
}

export interface CustomerProfile {
  full_name: string | null;
  credits_balance: number;
}

/** Signs in and fetches the profile for the confirm screen. Caller MUST eventually
 * call commitOwnSession() or cancelLogin() — both always sign out (try/finally),
 * so a customer's token never survives an error or an abandoned flow on the shared kiosk. */
export async function loginCustomer(email: string, password: string) {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) return { ok: false as const, error: authErr.message };

  const { data, error } = await supabase.from("profiles").select("full_name,credits_balance").single();
  if (error || !data) {
    await supabase.auth.signOut();
    return { ok: false as const, error: error?.message ?? "profile not found" };
  }
  return { ok: true as const, profile: data as CustomerProfile };
}

export async function cancelLogin() {
  await supabase.auth.signOut();
}

export async function commitOwnSession(stationId: string, packageType: string | null) {
  try {
    const { data, error } = await supabase.rpc("start_own_session", {
      p_station_id: stationId,
      p_package_type: packageType,
    });
    if (error) return { ok: false as const, error: error.message };
    return data as { ok: true; session_id: string; price_cents: number; planned_end_at: string | null } | { ok: false; error: string };
  } finally {
    await supabase.auth.signOut();
  }
}

export async function startCourtesySession(stationId: string, pin: string, packageType: string | null) {
  const { data, error } = await supabase.rpc("start_courtesy_session", {
    p_station_id: stationId,
    p_pin: pin,
    p_package_type: packageType,
  });
  if (error) throw error;
  return data as { ok: true; session_id: string; planned_end_at: string | null } | { ok: false; error: string };
}
