import { join } from "node:path";
import { ipcMain } from "electron";
import { ensureDir, move } from "fs-extra";
import { Channels } from "@/constant/channels";
import { IPCErrorTemplate } from "@/src/domains/validate/error";
import { withIPCValidate } from "@/validate/ipc";
import { SchemaCreateFolder, SchemaUpdateFolder } from "@/validate/schema";
import Logger from "../logger";
import { rootPath } from "./project";

export function IPCFolder() {
  ipcMain.handle(
    Channels.CreateFolder,
    withIPCValidate(SchemaCreateFolder, (_, data) => {
      return new Promise((resolve, reject) => {
        try {
          resolve(ensureDir(join(rootPath, data?.parentPath, data?.name)));
        } catch (error) {
          Logger.error(IPCErrorTemplate(Channels.CreateFolder, JSON.stringify(error)));
          reject(error);
        }
      });
    }),
  );

  ipcMain.handle(
    Channels.UpdateFolder,
    withIPCValidate(SchemaUpdateFolder, (_, data) => {
      return new Promise((resolve, reject) => {
        try {
          const oldPath = join(rootPath, data?.parentPath, data?.oldName);
          const newPath = join(rootPath, data?.parentPath, data?.name);
          resolve(move(oldPath, newPath, { overwrite: false }));
        } catch (error) {
          Logger.error(IPCErrorTemplate(Channels.UpdateFolder, JSON.stringify(error)));
          reject(error);
        }
      });
    }),
  );
}
