import { contextBridge, ipcRenderer } from "electron";
import type { AgentConfig } from "../main/store";

const api = {
  getConfig: (): Promise<AgentConfig | null> => ipcRenderer.invoke("config:get"),
  setConfig: (config: AgentConfig): Promise<void> => ipcRenderer.invoke("config:set", config),
  clearConfig: (): Promise<void> => ipcRenderer.invoke("config:clear"),
  setLocked: (locked: boolean): Promise<void> => ipcRenderer.invoke("window:setLocked", locked),
  quit: (): Promise<void> => ipcRenderer.invoke("app:quit"),
};

contextBridge.exposeInMainWorld("agent", api);

export type AgentBridge = typeof api;
