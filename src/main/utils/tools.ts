import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { app } from "electron";

export abstract class MainTools {
  static isDev = !app.isPackaged;

  static getRenderURL = (router: string) => {
    return `${MainTools.isDev ? `http://localhost:${process.env.PORT}` : pathToFileURL(resolve(__dirname, "../render/index.html")).href}${router}`;
  };
}
