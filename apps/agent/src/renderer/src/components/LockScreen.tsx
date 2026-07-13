import { useEffect, useRef, useState } from "react";
import { supabase, heartbeat, type HeartbeatSession } from "@/lib/supabase";
import { SelfServicePanel } from "./SelfServicePanel";
import type { AgentConfig } from "../../../main/store";

const HEARTBEAT_MS = 30_000;
const QUIT_HOLD_MS = 3000;

export function LockScreen({ config }: { config: AgentConfig }) {
  const [session, setSession] = useState<HeartbeatSession | null>(null);
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(true);
  const quitHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = session?.status === "active";

  // Tell the main process to lock/unlock whenever activity changes
  useEffect(() => {
    window.agent.setLocked(!isActive);
  }, [isActive]);

  // Heartbeat loop — source of truth fallback if Realtime ever drops
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await heartbeat(config.stationId, config.agentSecret);
        if (cancelled) return;
        setOnline(true);
        if (res.ok) setSession(res.session);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }
    tick();
    const t = setInterval(tick, HEARTBEAT_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [config.stationId, config.agentSecret]);

  // Realtime — instant reaction instead of waiting for the next heartbeat
  useEffect(() => {
    const channel = supabase
      .channel(`agent-${config.stationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `station_id=eq.${config.stationId}` },
        (payload) => {
          const row = payload.new as { status?: string } | null;
          if (!row) return;
          if (row.status === "active") {
            setSession(payload.new as HeartbeatSession);
          } else if (session?.id === (payload.new as { id?: string })?.id) {
            setSession(null);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.stationId]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function handleQuitPointerDown() {
    quitHoldRef.current = setTimeout(() => window.agent.quit(), QUIT_HOLD_MS);
  }
  function handleQuitPointerUp() {
    if (quitHoldRef.current) clearTimeout(quitHoldRef.current);
  }

  const elapsedMin = session ? Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 60_000) : 0;
  const remainingMin = session?.planned_end_at
    ? Math.max(0, Math.round((new Date(session.planned_end_at).getTime() - now.getTime()) / 60_000))
    : null;

  return (
    <div style={styles.container}>
      <div style={styles.center}>
        <p style={styles.eyebrow}>CYBER BRASIL</p>
        <h1 style={styles.title}>ARENA<span style={{ color: "#fbbf24" }}>.</span></h1>
        <p style={styles.station}>{config.label ?? `PC-${String(config.stationNumber).padStart(2, "0")}`}</p>

        {isActive ? (
          <div style={styles.activeBadge}>SESSÃO ATIVA</div>
        ) : (
          <div style={styles.lockedBadge}>BLOQUEADO</div>
        )}

        {isActive && (
          <div style={styles.widget}>
            <div>
              <p style={styles.widgetLabel}>Tempo de jogo</p>
              <p style={styles.widgetValue}>{elapsedMin}min</p>
            </div>
            {remainingMin !== null && (
              <div>
                <p style={styles.widgetLabel}>Restante</p>
                <p style={{ ...styles.widgetValue, color: remainingMin < 10 ? "#f87171" : "#fbbf24" }}>
                  {remainingMin}min
                </p>
              </div>
            )}
          </div>
        )}

        {!isActive && <SelfServicePanel stationId={config.stationId} />}

        {!online && <p style={styles.offline}>⚠ Sem conexão — tentando reconectar…</p>}
      </div>

      {/* Invisible maintenance hotspot: hold 3s to quit (staff only) */}
      <div
        onPointerDown={handleQuitPointerDown}
        onPointerUp={handleQuitPointerUp}
        onPointerLeave={handleQuitPointerUp}
        style={styles.maintenanceHotspot}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh", width: "100vw", background: "#09090f", color: "#f8fafc",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", userSelect: "none",
  },
  center: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  eyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: 5, color: "#64748b", margin: 0 },
  title: { fontSize: 40, fontWeight: 900, letterSpacing: -1, margin: "2px 0 20px" },
  station: { fontSize: 15, fontWeight: 700, color: "#94a3b8", margin: "0 0 24px" },
  lockedBadge: {
    fontSize: 12, fontWeight: 800, letterSpacing: 2, padding: "8px 20px", borderRadius: 999,
    background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)",
  },
  activeBadge: {
    fontSize: 12, fontWeight: 800, letterSpacing: 2, padding: "8px 20px", borderRadius: 999,
    background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)",
  },
  widget: { display: "flex", gap: 40, marginTop: 32 },
  widgetLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#64748b", margin: 0 },
  widgetValue: { fontSize: 28, fontWeight: 900, color: "#f8fafc", margin: "4px 0 0" },
  instructions: { fontSize: 13, color: "#475569", marginTop: 28 },
  offline: { fontSize: 11, color: "#f87171", marginTop: 20 },
  maintenanceHotspot: { position: "absolute", bottom: 0, right: 0, width: 60, height: 60 },
};
