import { extname, join } from "node:path";
import { ipcMain } from "electron";
import { ensureFile } from "fs-extra";
import { Channels } from "@/constant/channels";
import { IPCErrorTemplate } from "@/src/domains/validate/error";
import { withIPCValidate } from "@/validate/ipc";
import { SchemaCreateFile } from "@/validate/schema";
import Logger from "../logger";
import { ContentViewManager } from "../views";
import { rootPath } from "./project";

export function IPCFile() {
  ipcMain.handle(Channels.OpenFile, (_, data) => {
    return new Promise((resolve, reject) => {
      try {
        const dir = join(rootPath, data?.project);
        const file = join(rootPath, data?.file);
        resolve(ContentViewManager.onCreate(dir, file));
      } catch (error) {
        Logger.error(IPCErrorTemplate(Channels.OpenFile, JSON.stringify(error)));
        reject(error);
      }
    });
  });

  ipcMain.handle(
    Channels.CreateFile,
    withIPCValidate(SchemaCreateFile, (_, data) => {
      return new Promise((resolve, reject) => {
        try {
          const fileName = extname(data.name) ? data?.name : `${data?.name}.txt`;
          resolve(ensureFile(join(rootPath, data?.parentPath, fileName)));
        } catch (error) {
          Logger.error(IPCErrorTemplate(Channels.CreateFolder, JSON.stringify(error)));
          reject(error);
        }
      });
    }),
  );
}
