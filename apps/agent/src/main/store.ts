import Store from "electron-store";

export interface AgentConfig {
  stationId: string;
  stationNumber: number;
  label: string | null;
  agentSecret: string;
}

interface StoreSchema {
  config: AgentConfig | null;
}

export const store = new Store<StoreSchema>({
  name: "agent-config",
  defaults: { config: null },
});
