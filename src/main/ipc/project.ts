import { join } from "node:path";
import { app, ipcMain } from "electron";
import {
  ensureDir,
  existsSync,
  pathExistsSync,
  readdir,
  readdirSync,
  statSync,
  writeJson,
} from "fs-extra";
import { Channels } from "@/constant/channels";
import type { FileType, FolderType } from "@/src/domains/types";
import { FunctionErrorTemplate, IPCErrorTemplate } from "@/validate/error";
import { withIPCValidate } from "@/validate/ipc";
import { SchemaCreateProject, SchemaProjectDirectory } from "@/validate/schema";
import Logger from "../logger";
import { MainTools } from "../utils/tools";

// 项目的根路径
export const rootPath = join(app.getPath("userData"), "./i-latex-projects");
console.log(`Root Path: ${rootPath}`);

export function checkConfigFile(path: string) {
  return new Promise((resolve, reject) => {
    try {
      const configPath = join(path, "__config.json");
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

const ignoreDirs = ["__config.json", ".cache"];

function getRelativePath(path: string) {
  return (path ?? "").replace(rootPath, "");
}

function walk(path: string): Promise<{
  tree: any[];
  list: any[];
}> {
  // biome-ignore lint/suspicious/noAsyncPromiseExecutor: need async to await readdir
  return new Promise(async (resolve) => {
    const dirents = await readdir(path, { withFileTypes: true });
    const nodes = [];
    const list = [];
    for (const dirent of dirents) {
      if (ignoreDirs.some((item) => dirent.name.includes(item)) || dirent.name.startsWith(".")) {
        continue;
      }
      const fullPath = join(path, dirent.name);
      const isDir = dirent.isDirectory();
      if (isDir) {
        const baseItem: FolderType & { isDir: boolean } = {
          name: dirent.name,
          parentPath: getRelativePath(path),
          isDir: true,
          children: [],
        };
        list.push(baseItem);
        const node: any = { ...baseItem };
        const _children = await walk(fullPath);
        node.children = _children?.tree ?? [];
        nodes.push(node);
      } else {
        const baseItem: FileType & { isDir: boolean } = {
          name: dirent.name,
          parentPath: getRelativePath(path),
          isDir: false,
        };
        list.push(baseItem);
        const node = { ...baseItem };
        nodes.push(node);
      }
    }
    resolve({
      tree: nodes,
      list,
    });
  });
}

export function IPCProject() {
  ipcMain.handle(
    Channels.CreateProject,
    withIPCValidate(SchemaCreateProject, (_, data) => {
      // biome-ignore lint/suspicious/noAsyncPromiseExecutor: need async to await readdir
      return new Promise(async (resolve, reject) => {
        try {
          const path = join(rootPath, `./${data.name}`);
          await ensureDir(path);
          await checkConfigFile(path);
          return resolve(`/${data.name}`);
        } catch (error) {
          Logger.error(IPCErrorTemplate(Channels.CreateProject, JSON.stringify(error)));
          reject(error);
        }
      });
    }),
  );

  ipcMain.handle(
    Channels.ProjectDirectory,
    withIPCValidate(SchemaProjectDirectory, (_, data) => {
      return new Promise((resolve, reject) => {
        try {
          const projectPath = join(rootPath, data.name);
          return resolve(walk(projectPath));
        } catch (error) {
          Logger.error(IPCErrorTemplate(Channels.ProjectDirectory, JSON.stringify(error)));
          reject(error);
        }
      });
    }),
  );

  ipcMain.handle(Channels.ProjectList, () => {
    return new Promise((resolve, reject) => {
      try {
        if (!existsSync(rootPath)) {
          IPCErrorTemplate(Channels.ProjectList, "获取根路径失败!");
          return resolve([]);
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
        Logger.error(IPCErrorTemplate(Channels.ProjectList, JSON.stringify(error)));
        reject(error);
      }
    });
  });
}
