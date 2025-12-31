import { readFileSync } from "node:fs";
import { ipcMain, type WebContentsView } from "electron";
import { Channels } from "@/src/domains/constant/channels";
import { UIConstant } from "@/src/domains/constant/ui";
import RouterPath from "@/src/render/router/paths";
import { mainWindow } from "../..";
import { MainTools } from "../../utils/tools";
import { BaseView } from "../base-view";

export abstract class ImageViewManager {
  static view: WebContentsView | null = null;

  static async onCreate(_dir: string, file: string) {
    const size = mainWindow?.getBounds();
    const _x = UIConstant.SideWidth + 20;
    ImageViewManager.view = BaseView({
      bounds: {
        x: _x,
        y: UIConstant.TabHeight + 20,
        width: (size?.width as any) - _x - UIConstant.AppPadding,
        height: (size?.height as any) - UIConstant.TabHeight - 10 - UIConstant.AppPadding * 2,
      },
      loadURL: MainTools.getRenderURL(RouterPath.ImageEditor),
    });
    MainTools.isDev &&
      ImageViewManager.view?.webContents.openDevTools({
        mode: "bottom",
      });
    const viewId = ImageViewManager.view.webContents.id;
    ipcMain.handle(`${Channels.ImageInfo}-${viewId}`, () => {
      return {
        buffer: readFileSync(file),
      };
    });
    mainWindow?.contentView.addChildView(ImageViewManager.view);
    return ImageViewManager.view;
  }
}
