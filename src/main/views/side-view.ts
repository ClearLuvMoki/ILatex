import { UIConstant } from "@/domains/constant/ui";
import RouterPath from "@/render/router/paths";
import { mainWindow } from "..";
import { MainTools } from "../utils/tools";
import { BaseView } from "./base-view";

export abstract class SideViewManager {
  static onCreate() {
    const size = mainWindow?.getBounds();
    const view = BaseView({
      bounds: {
        x: UIConstant.AppPadding,
        y: UIConstant.AppPadding,
        width: UIConstant.SideWidth,
        height: (size?.height as any) - UIConstant.AppPadding * 2,
      },
      loadURL: MainTools.getRenderURL(RouterPath.Sider),
    });
    // MainTools.isDev && view.webContents.openDevTools();
    mainWindow?.contentView.addChildView(view);
  }
}
