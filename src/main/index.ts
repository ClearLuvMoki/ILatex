import { app, BrowserWindow } from "electron";
import path from "node:path";
import * as process from "node:process";
import * as Sentry from "@sentry/electron";
import { MainTools } from "./utils/tools";
import { initStatistics } from "./statistics";
import { IPCProject } from "./ipc";

Sentry.init({
  dsn: "https://dcf4c1ca7feaa198e792734e6d29f620@o4507683589062656.ingest.us.sentry.io/4510360903548933",
});

// 禁止 GPU 加速
// app.disableHardwareAcceleration();
export let mainWindow: BrowserWindow | null = null;

const loadUrl: string = MainTools.isDev
  ? `http://localhost:${process.env.PORT}`
  : `file://${path.resolve(__dirname, "../render/index.html")}`;

const initIpc = () => {
  IPCProject();
};

const onCreateMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    minWidth: 1000,
    height: 920,
    minHeight: 700,
    center: true,
    useContentSize: true,
    titleBarStyle: "hiddenInset",
    vibrancy: "sidebar",
    backgroundMaterial: "mica",
    visualEffectState: "active",
    transparent: true,
    trafficLightPosition: { x: 23, y: 22 },
    icon: path.resolve(__dirname, "./icon.png"),
    webPreferences: {
      devTools: true,
      nodeIntegration: true,
      webSecurity: false,
      webviewTag: true,
      preload: path.resolve(__dirname, "./preload.js"),
    },
  });
  mainWindow.loadURL(loadUrl);
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on("ready", async () => {
  initStatistics();
  initIpc();
  onCreateMainWindow();
});
