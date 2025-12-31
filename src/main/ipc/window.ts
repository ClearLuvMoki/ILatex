import { ipcMain } from "electron";
import { Channels } from "@/src/domains/constant/channels";
import { ContentViewManager, TabViewManager } from "../views";

export function IPCWindow() {
  ipcMain.handle(Channels.AllTabs, () => {
    return TabViewManager.allTabs();
  });

  ipcMain.handle(Channels.ReloadTabs, () => {
    TabViewManager.notify();
  });

  ipcMain.handle(Channels.RenderGetViewId, (event) => {
    return event.sender.id;
  });

  ipcMain.handle(Channels.SelectTab, (_, id: number) => {
    ContentViewManager.onSetCurrentView(id);
  });
}
