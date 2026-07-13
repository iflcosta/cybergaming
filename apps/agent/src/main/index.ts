import { app, BrowserWindow, ipcMain, screen } from "electron";
import { join } from "node:path";
import { store, type AgentConfig } from "./store";

let win: BrowserWindow | null = null;
let locked = true;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  win = new BrowserWindow({
    width,
    height,
    frame: false,
    resizable: false,
    movable: false,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    backgroundColor: "#09090f",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  // "screen-saver" level can cover the Task Manager and even the secure
  // Ctrl+Alt+Del desktop, trapping staff on-site. "pop-up-menu" stays above
  // normal app windows without going that far.
  win.setAlwaysOnTop(true, "pop-up-menu");
  win.setMenuBarVisibility(false);

  // Maintenance shortcut: Ctrl+Shift+I opens DevTools for on-site debugging.
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      win?.webContents.toggleDevTools();
    }
  });

  // Only a deliberate quit from the renderer (staff-code gated) is allowed to close the window;
  // anything else (Alt+F4, taskbar — though it's hidden) just re-locks instead.
  win.on("close", (e) => {
    if (!appQuitting) {
      e.preventDefault();
      applyLockState(true);
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function applyLockState(shouldLock: boolean) {
  locked = shouldLock;
  if (!win) return;
  if (shouldLock) {
    win.setAlwaysOnTop(true, "pop-up-menu");
    win.setFullScreen(true);
    win.show();
    win.focus();
  } else {
    win.setAlwaysOnTop(false);
    win.minimize();
  }
}

let appQuitting = false;

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
  }
  createWindow();
});

app.on("window-all-closed", () => {
  // Kiosk agent: never quit just because the window closed, unless we're deliberately exiting.
  if (appQuitting) app.quit();
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// ---- IPC surface exposed to the renderer via preload ----

ipcMain.handle("config:get", (): AgentConfig | null => store.get("config"));

ipcMain.handle("config:set", (_e, config: AgentConfig) => {
  store.set("config", config);
});

ipcMain.handle("config:clear", () => {
  store.set("config", null);
});

ipcMain.handle("window:setLocked", (_e, shouldLock: boolean) => {
  applyLockState(shouldLock);
});

ipcMain.handle("app:quit", () => {
  appQuitting = true;
  app.quit();
});
