import { resolve } from "node:path";
import { WebContentsView } from "electron";
import { mainWindow } from "..";
import { MainTools } from "../utils/tools";

export function BaseView({
  bounds,
  loadURL,
}: {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  loadURL: string;
}) {
  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      transparent: true,
      devTools: MainTools.isDev,
      preload: resolve(__dirname, "./preload.js"),
    },
  });
  view.setBounds(bounds);
  view.webContents.loadURL(loadURL);
  mainWindow?.on("resize", () => {
    view.setBounds(bounds);
  });
  //   mainWindow?.contentView.addChildView(view);
  return view;
}
