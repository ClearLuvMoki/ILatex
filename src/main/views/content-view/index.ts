import { extname } from "node:path";
import type { WebContentsView } from "electron";
import { UIConstant } from "@/src/domains/constant/ui";
import { mainWindow } from "../..";
import { PreviewViewManager, TabViewManager } from "..";
import { ImageViewManager } from "./image-view";
import { MarkdownViewManager } from "./markdown-view";
import { TypstCodeViewManager } from "./typst-code-view";

export class ContentViewManager {
  static views: Map<
    number,
    {
      view: WebContentsView;
      path: string;
    }
  > = new Map();
  static currentView: number | null = null;

  static onSetCurrentView(id?: number) {
    if (!id) return;
    ContentViewManager.currentView = id;
    TabViewManager.notify();
    const view = ContentViewManager.views.get(id)?.view;
    if (view) {
      mainWindow?.contentView.addChildView(view);
      const size = mainWindow?.getBounds();
      const _x = UIConstant.SideWidth + 20;
      view.setBounds({
        x: _x,
        y: UIConstant.TabHeight + 20,
        width: (size?.width as any) - _x - UIConstant.AppPadding,
        height: (size?.height as any) - UIConstant.TabHeight - 10 - UIConstant.AppPadding * 2,
      });
      ContentViewManager.layoutView();
    }
  }

  static layoutView() {
    const size = mainWindow?.getBounds();
    const bounds = {
      x: UIConstant.SideWidth + 20,
      y: UIConstant.TabHeight + 20,
      width: (size?.width as any) - UIConstant.PreviewWidth - 300 - UIConstant.AppPadding * 2 - 20,
      height: (size?.height as any) - UIConstant.TabHeight - 10 - UIConstant.AppPadding * 2,
    };
    if (PreviewViewManager.isShow) {
      const _x = (size?.width as any) - UIConstant.PreviewWidth - UIConstant.AppPadding;
      PreviewViewManager.view?.setBounds({
        x: _x,
        y: UIConstant.TabHeight + 20,
        width: UIConstant.PreviewWidth,
        height: (size?.height as any) - UIConstant.TabHeight - 10 - UIConstant.AppPadding * 2,
      });
      TypstCodeViewManager.view?.setBounds(bounds);
      ImageViewManager.view?.setBounds(bounds);
      MarkdownViewManager.view?.setBounds(bounds);
    } else {
      const bounds = {
        x: UIConstant.SideWidth + 20,
        y: UIConstant.TabHeight + 20,
        width: (size?.width as any) - UIConstant.AppPadding * 2 - 20,
        height: (size?.height as any) - UIConstant.TabHeight - 10 - UIConstant.AppPadding * 2,
      };
      TypstCodeViewManager.view?.setBounds(bounds);
      ImageViewManager.view?.setBounds(bounds);
      MarkdownViewManager.view?.setBounds(bounds);
    }
  }

  static onCreate(dir: string, file: string) {
    if (!file) return;
    const isExists = [...ContentViewManager.views.values()].some((v) => v.path === file);
    if (isExists) {
      const viewId = [...ContentViewManager.views.values()].find((v) => v.path === file)?.view
        ?.webContents?.id;
      ContentViewManager.onSetCurrentView(viewId);
      return;
    }
    switch (extname(file)) {
      case ".typ": {
        TypstCodeViewManager.onCreate(dir, file).then((view) => {
          const id = view.webContents?.id;
          if (!id) return;
          ContentViewManager.currentView = id;
          ContentViewManager.views.set(id, {
            view,
            path: file,
          });
          TabViewManager.notify();
        });
        break;
      }
      case ".md": {
        MarkdownViewManager.onCreate(dir, file).then((view) => {
          const id = view.webContents?.id;
          if (!id) return;
          ContentViewManager.currentView = id;
          ContentViewManager.views.set(id, {
            view,
            path: file,
          });
          TabViewManager.notify();
        });
        break;
      }
      case ".png":
      case ".jpg":
      case ".jpeg":
      case ".gif": {
        ImageViewManager.onCreate(dir, file).then((view) => {
          const id = view.webContents?.id;
          if (!id) return;
          ContentViewManager.currentView = id;
          ContentViewManager.views.set(id, {
            view,
            path: file,
          });
          TabViewManager.notify();
        });
        break;
      }
      default:
        break;
    }
  }
}
