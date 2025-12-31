import path from "node:path";
import { app, BaseWindow } from "electron";
import { IPCFile, IPCFolder, IPCProject, IPCWindow } from "./ipc";
import { createMenu } from "./menu";
import { initStatistics } from "./statistics";
import { PreviewViewManager, SideViewManager, TabViewManager } from "./views";

// Sentry.init({
//   dsn: "https://dcf4c1ca7feaa198e792734e6d29f620@o4507683589062656.ingest.us.sentry.io/4510360903548933",
// });

export let mainWindow: BaseWindow | null = null;

const initIpc = () => {
  IPCProject();
  IPCFolder();
  IPCFile();
  IPCWindow();
};

const onCreateMainWindow = () => {
  mainWindow = new BaseWindow({
    width: 1700,
    minWidth: 1200,
    height: 1100,
    minHeight: 1100,
    center: true,
    useContentSize: true,
    titleBarStyle: "hiddenInset",
    vibrancy: "sidebar",
    backgroundMaterial: "mica",
    visualEffectState: "active",
    transparent: true,
    trafficLightPosition: { x: 23, y: 22 },
    icon: path.resolve(__dirname, "./icon.png"),
  });
  SideViewManager.onCreate();
  TabViewManager.onCreate();
  PreviewViewManager.onCreate();
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
  createMenu();
  initStatistics();
  initIpc();
  onCreateMainWindow();
});
