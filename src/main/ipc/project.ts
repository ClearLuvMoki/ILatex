import { Channels } from "@/constant/channels";
import { SchemaCreateProject } from "@/validate/schema";
import { withIPCValidate } from "@/validate/ipc";
import { ipcMain, app } from "electron";
import { join } from "node:path";
import {
  ensureDir,
  pathExistsSync,
  writeJson,
  existsSync,
  readdirSync,
  statSync,
} from "fs-extra";
import Logger from "../logger";
import { FunctionErrorTemplate, IPCErrorTemplate } from "@/validate/error";
import { MainTools } from "../utils/tools";

// 项目的根路径
const rootPath = join(app.getPath("userData"), "./i-latex-projects");
console.log(`Root Path: ${rootPath}`);

export function checkConfigFile(path: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const configPath = join(path, "config.json");
      // TODO: 校验配置文件的完整性
      if (pathExistsSync(configPath)) return;
      const template = {
        type: "typst",
      };
      MainTools.isDev && console.log(`Config template path: ${configPath}`);
      resolve(writeJson(configPath, template, { spaces: 2 }));
    } catch (error) {
      FunctionErrorTemplate("checkConfigFile", JSON.stringify(error));
      reject(error);
    }
  });
}

export function IPCProject() {
  ipcMain.handle(
    Channels.CreateProject,
    withIPCValidate(SchemaCreateProject, (_, data) => {
      return new Promise(async (resolve, reject) => {
        try {
          const path = join(rootPath, `./${data.name}`);
          await ensureDir(path);
          await checkConfigFile(path);
          return resolve(`/${data.name}`);
        } catch (error) {
          Logger.error(
            IPCErrorTemplate(Channels.CreateProject, JSON.stringify(error)),
          );
          reject(error);
        }
      });
    }),
  );

  ipcMain.handle(Channels.ProjectList, () => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!existsSync(rootPath)) {
          IPCErrorTemplate(Channels.ProjectList, "获取根路径失败!");
          return [];
        }

        return resolve(
          readdirSync(rootPath)
            .map((name) => join(rootPath, name))
            .filter((p) => statSync(p).isDirectory())
            .map((path) => {
              return {
                name: path.split("/").pop(),
              };
            }),
        );
      } catch (error) {
        Logger.error(
          IPCErrorTemplate(Channels.ProjectList, JSON.stringify(error)),
        );
        reject(error);
      }
    });
  });
}
