import { useEffect, useState } from "react";
import {
  fetchPackages, loginCustomer, cancelLogin, commitOwnSession, startCourtesySession,
  type AgentPackage, type CustomerProfile,
} from "@/lib/supabase";

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Stage = "login" | "confirm";

export function SelfServicePanel({ stationId, online }: { stationId: string; online: boolean }) {
  const [packages, setPackages] = useState<AgentPackage[]>([]);
  const [pkg, setPkg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<Stage>("login");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [staffMode, setStaffMode] = useState(false);
  const [pin, setPin] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  useEffect(() => {
    fetchPackages().then(setPackages).catch(() => {});
  }, []);

  const selectedPrice = pkg ? packages.find((p) => p.code === pkg)?.price_cents ?? 0 : 0;
  const insufficient = !!pkg && !!profile && profile.credits_balance < selectedPrice;

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await loginCustomer(email, password);
      if (!result.ok) {
        setError(errorLabel(result.error));
        setLoading(false);
        return;
      }
      setProfile(result.profile);
      setStage("confirm");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function confirmStart() {
    setLoading(true);
    setError("");
    try {
      const result = await commitOwnSession(stationId, pkg);
      if (!result.ok) {
        setError(errorLabel(result.error));
        setLoading(false);
        setStage("login");
        setPassword("");
        return;
      }
      // Realtime will pick up the new active session and unlock — nothing else to do.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      setStage("login");
    }
  }

  async function cancelConfirm() {
    setLoading(true);
    await cancelLogin();
    setLoading(false);
    setStage("login");
    setPassword("");
    setProfile(null);
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setStaffLoading(true);
    setStaffError("");
    try {
      const result = await startCourtesySession(stationId, pin, pkg);
      if (!result.ok) {
        setStaffError(result.error === "invalid pin" ? "PIN inválido" : errorLabel(result.error));
        setStaffLoading(false);
        setPin("");
        return;
      }
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : String(err));
      setStaffLoading(false);
    }
  }

  function errorLabel(code: string): string {
    if (code === "invalid credentials" || code.includes("Invalid login")) return "E-mail ou senha incorretos";
    if (code === "insufficient credits") return "Créditos insuficientes — recarregue no app ou pague no caixa";
    if (code === "station already in use") return "Este PC já está em uso";
    if (code === "customer already has an active session") return "Você já tem uma sessão ativa em outro PC";
    if (code === "pin locked") return "Muitas tentativas — aguarde alguns minutos";
    return code;
  }

  if (staffMode) {
    return (
      <form onSubmit={submitPin} style={styles.panel}>
        <p style={styles.panelTitle}>Acesso staff</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="PIN"
          disabled={!online}
          style={styles.input}
        />
        <PackagePicker packages={packages} value={pkg} onChange={setPkg} />
        {staffError && <p style={styles.error}>{staffError}</p>}
        <div style={styles.row}>
          <button type="button" onClick={() => setStaffMode(false)} style={styles.secondaryButton}>Voltar</button>
          <button type="submit" disabled={staffLoading || !online || pin.length < 4} style={styles.button}>
            {staffLoading ? "Abrindo…" : "Abrir cortesia"}
          </button>
        </div>
      </form>
    );
  }

  if (stage === "confirm" && profile) {
    return (
      <div style={styles.panel}>
        <p style={styles.panelTitle}>Confirmar</p>
        <div style={styles.confirmBox}>
          <p style={styles.confirmRow}><span>Cliente</span><span>{profile.full_name ?? "—"}</span></p>
          <p style={styles.confirmRow}><span>Saldo</span><span>{formatCents(profile.credits_balance)}</span></p>
          <p style={styles.confirmRow}>
            <span>Plano</span>
            <span>{pkg ? packages.find((p) => p.code === pkg)?.label : "Sessão aberta"}</span>
          </p>
          {pkg && (
            <p style={styles.confirmRow}><span>Valor</span><span style={{ color: insufficient ? "#f87171" : "#fbbf24" }}>{formatCents(selectedPrice)}</span></p>
          )}
        </div>
        {insufficient && <p style={styles.error}>Saldo insuficiente para este plano</p>}
        {error && <p style={styles.error}>{error}</p>}
        <div style={styles.row}>
          <button type="button" onClick={cancelConfirm} disabled={loading} style={styles.secondaryButton}>Cancelar</button>
          <button type="button" onClick={confirmStart} disabled={loading || insufficient} style={styles.button}>
            {loading ? "Iniciando…" : "Confirmar e iniciar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submitLogin} style={styles.panel}>
      <p style={styles.panelTitle}>Entrar com sua conta</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-mail"
        autoComplete="off"
        disabled={!online}
        style={styles.input}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        autoComplete="off"
        disabled={!online}
        style={styles.input}
      />
      <PackagePicker packages={packages} value={pkg} onChange={setPkg} />
      {error && <p style={styles.error}>{error}</p>}
      <button type="submit" disabled={loading || !online || !email || !password} style={styles.button}>
        {loading ? "Entrando…" : "Continuar"}
      </button>
      <button type="button" onClick={() => setStaffMode(true)} style={styles.linkButton}>
        Acesso staff
      </button>
      {!online && <p style={styles.error}>Sem conexão — aguarde reconectar</p>}
    </form>
  );
}

function PackagePicker({ packages, value, onChange }: { packages: AgentPackage[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} style={styles.select}>
      <option value="">Sessão aberta (cobrada por tempo)</option>
      {packages.map((p) => (
        <option key={p.code} value={p.code}>{p.label} — {formatCents(p.price_cents)}</option>
      ))}
    </select>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: { display: "flex", flexDirection: "column", gap: 8, width: 260, marginTop: 24 },
  panelTitle: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", margin: "0 0 4px", textAlign: "center" },
  input: {
    padding: "10px 12px", borderRadius: 8, fontSize: 13, textAlign: "center",
    background: "#141420", border: "1px solid #262638", color: "#f8fafc", outline: "none",
  },
  select: {
    padding: "10px 12px", borderRadius: 8, fontSize: 12, textAlign: "center",
    background: "#141420", border: "1px solid #262638", color: "#f8fafc", outline: "none",
  },
  button: {
    padding: "12px", borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: 1,
    textTransform: "uppercase", background: "#fbbf24", color: "#09090f", border: "none", cursor: "pointer", flex: 1,
  },
  secondaryButton: {
    padding: "12px", borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: 1,
    textTransform: "uppercase", background: "transparent", color: "#94a3b8", border: "1px solid #262638", cursor: "pointer", flex: 1,
  },
  linkButton: {
    background: "none", border: "none", color: "#475569", fontSize: 11, cursor: "pointer", marginTop: 4, textDecoration: "underline",
  },
  error: { color: "#f87171", fontSize: 11, margin: 0, textAlign: "center" },
  row: { display: "flex", gap: 8 },
  confirmBox: { display: "flex", flexDirection: "column", gap: 6, padding: 12, borderRadius: 8, background: "#141420", border: "1px solid #262638" },
  confirmRow: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cbd5e1", margin: 0 },
};
