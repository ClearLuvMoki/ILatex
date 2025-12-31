import type { WebContentsView } from "electron";
import { UIConstant } from "@/src/domains/constant/ui";
import RouterPath from "@/src/render/router/paths";
import { mainWindow } from "..";
import { MainTools } from "../utils/tools";
import { BaseView } from "./base-view";
import { ContentViewManager } from "./content-view";

export class PreviewViewManager {
  static view: WebContentsView | null = null;
  static isShow = false;

  static onCreate() {
    const size = mainWindow?.getBounds();
    const _x = (size?.width as any) - UIConstant.PreviewWidth - UIConstant.AppPadding;
    PreviewViewManager.view = BaseView({
      bounds: {
        x: _x,
        y: UIConstant.TabHeight + 20,
        width: UIConstant.PreviewWidth,
        height: (size?.height as any) - UIConstant.TabHeight - 20,
      },
      loadURL: MainTools.getRenderURL(RouterPath.Preview),
    });
    MainTools.isDev &&
      PreviewViewManager.view?.webContents.openDevTools({
        mode: "bottom",
      });
  }

  static onShow(url: string) {
    PreviewViewManager.isShow = true;
    PreviewViewManager.view?.webContents.loadURL(
      MainTools.getRenderURL(`${RouterPath.Preview}?url=${encodeURIComponent(url)}`),
    );
    ContentViewManager.layoutView();
    PreviewViewManager.view && mainWindow?.contentView.addChildView(PreviewViewManager.view);
  }

  static onHide() {
    PreviewViewManager.isShow = false;
    PreviewViewManager.view && mainWindow?.contentView.removeChildView(PreviewViewManager.view);
  }

  static sendMessage(channel: string, msg: string) {
    PreviewViewManager.view?.webContents.send(channel, msg);
  }
}
