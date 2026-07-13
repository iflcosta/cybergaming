import { useEffect, useState } from "react";
import { SetupScreen } from "./components/SetupScreen";
import { LockScreen } from "./components/LockScreen";
import type { AgentConfig } from "../../main/store";

export function App() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.agent.getConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!config) {
    return <SetupScreen onPaired={setConfig} />;
  }

  return <LockScreen config={config} />;
}
