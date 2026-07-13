import { useState } from "react";
import { pairAgent } from "@/lib/supabase";
import type { AgentConfig } from "../../../main/store";

export function SetupScreen({ onPaired }: { onPaired: (config: AgentConfig) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setError("O código tem 6 dígitos"); return; }
    setLoading(true);
    setError("");
    try {
      const result = await pairAgent(code);
      if (!result.ok) {
        setError(result.error === "invalid or expired code" ? "Código inválido ou expirado" : "Erro ao parear");
        setLoading(false);
        return;
      }
      const config: AgentConfig = {
        stationId: result.station_id,
        stationNumber: result.station_number,
        label: result.label,
        agentSecret: result.agent_secret,
      };
      await window.agent.setConfig(config);
      onPaired(config);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Erro de conexão: ${detail}`);
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <p style={styles.eyebrow}>CYBER BRASIL</p>
      <h1 style={styles.title}>ARENA<span style={{ color: "#fbbf24" }}>.</span></h1>
      <p style={styles.subtitle}>Configuração inicial deste PC</p>

      <form onSubmit={submit} style={styles.form}>
        <label style={styles.label}>Código de pareamento</label>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={loading || code.length !== 6} style={styles.button}>
          {loading ? "Conectando…" : "Parear"}
        </button>
        <p style={styles.hint}>Gere o código no painel admin → Config → PCs</p>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#09090f",
    fontFamily: "system-ui, -apple-system, sans-serif", color: "#f8fafc",
  },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 4, color: "#64748b", margin: 0 },
  title: { fontSize: 32, fontWeight: 900, letterSpacing: -1, margin: "4px 0 32px" },
  subtitle: { fontSize: 13, color: "#94a3b8", marginTop: -24, marginBottom: 32 },
  form: { display: "flex", flexDirection: "column", gap: 10, width: 280 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8" },
  input: {
    padding: "14px 16px", borderRadius: 8, fontSize: 24, textAlign: "center", letterSpacing: 8,
    background: "#141420", border: "1px solid #262638", color: "#f8fafc", outline: "none",
  },
  error: { color: "#f87171", fontSize: 12, margin: 0 },
  button: {
    padding: "14px", borderRadius: 8, fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
    textTransform: "uppercase", background: "#fbbf24", color: "#09090f", border: "none", cursor: "pointer",
  },
  hint: { fontSize: 11, color: "#475569", textAlign: "center", marginTop: 8 },
};
