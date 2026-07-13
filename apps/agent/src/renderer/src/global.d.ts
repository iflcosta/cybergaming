import type { AgentBridge } from "../../preload/index";

declare global {
  interface Window {
    agent: AgentBridge;
  }
}

export {};
