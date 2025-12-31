import { readFileSync } from "node:fs";
import { ipcMain, type WebContentsView } from "electron";
import { Channels } from "@/src/domains/constant/channels";
import { UIConstant } from "@/src/domains/constant/ui";
import RouterPath from "@/src/render/router/paths";
import { mainWindow } from "../..";
import { MainTools } from "../../utils/tools";
import { BaseView } from "../base-view";

export abstract class MarkdownViewManager {
  static view: WebContentsView | null = null;

  static async onCreate(_dir: string, file: string) {
    const size = mainWindow?.getBounds();
    const _x = UIConstant.SideWidth + 20;
    MarkdownViewManager.view = BaseView({
      bounds: {
        x: _x,
        y: UIConstant.TabHeight + 20,
        width: (size?.width as any) - _x - UIConstant.AppPadding,
        height: (size?.height as any) - UIConstant.TabHeight - 10 - UIConstant.AppPadding * 2,
      },
      loadURL: MainTools.getRenderURL(RouterPath.MarkdownEditor),
    });
    MainTools.isDev &&
      MarkdownViewManager.view?.webContents.openDevTools({
        mode: "bottom",
      });
    const viewId = MarkdownViewManager.view.webContents.id;
    ipcMain.handle(`${Channels.MarkdownInfo}-${viewId}`, () => {
      return {
        data: readFileSync(file, "utf-8"),
      };
    });
    mainWindow?.contentView.addChildView(MarkdownViewManager.view);
    return MarkdownViewManager.view;
  }
}
