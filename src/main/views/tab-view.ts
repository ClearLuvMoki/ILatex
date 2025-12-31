import { basename } from "node:path";
import type { WebContentsView } from "electron";
import { UIConstant } from "@/domains/constant/ui";
import { Channels } from "@/src/domains/constant/channels";
import RouterPath from "@/src/render/router/paths";
import { mainWindow } from "..";
import { MainTools } from "../utils/tools";
import { BaseView } from "./base-view";
import { ContentViewManager } from "./content-view";

export class TabViewManager {
  static view: WebContentsView | null = null;
  static editView: number[] = [];

  static allTabs() {
    return Array.from(ContentViewManager.views).map((item) => {
      return {
        id: item[0],
        title: basename(item[1].path),
        isEditing: TabViewManager.editView.includes(item[0]),
        isSelected: item[0] === ContentViewManager.currentView,
      };
    });
  }

  static notify() {
    TabViewManager.view?.webContents.send(Channels.TabChangeListen, TabViewManager.allTabs());
  }

  static onCreate() {
    const size = mainWindow?.getBounds();
    const _x = UIConstant.SideWidth + 20;
    TabViewManager.view = BaseView({
      bounds: {
        x: _x,
        y: UIConstant.AppPadding,
        width: (size?.width as any) - _x - UIConstant.AppPadding,
        height: UIConstant.TabHeight,
      },
      loadURL: MainTools.getRenderURL(RouterPath.Tabs),
    });
    // MainTools.isDev && TabViewManager.view.webContents.toggleDevTools();
    mainWindow?.contentView.addChildView(TabViewManager.view);
    mainWindow?.addListener("resize", () => {
      const size = mainWindow?.getBounds();
      const _x = UIConstant.SideWidth + 20;
      TabViewManager.view?.setBounds({
        x: _x,
        y: UIConstant.AppPadding,
        width: (size?.width as any) - _x - UIConstant.AppPadding,
        height: UIConstant.TabHeight,
      });
    });
  }
}
