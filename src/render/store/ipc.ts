import type { z } from "zod";
import { Channels } from "@/constant/channels";
import { IPCInvokeValidate } from "@/validate/ipc";
import {
  SchemaCreateFile,
  SchemaCreateFolder,
  SchemaCreateProject,
  SchemaProjectDirectory,
  SchemaUpdateFolder,
} from "@/validate/schema";

export type CreateProjectType = z.infer<typeof SchemaCreateProject>;
export type CreateFolderType = z.infer<typeof SchemaCreateFolder>;
export type UpdateFolderType = z.infer<typeof SchemaUpdateFolder>;
export type CreateFileType = z.infer<typeof SchemaCreateFile>;

class _IPCClient {
  @IPCInvokeValidate(SchemaCreateProject)
  async createProject(data: CreateProjectType) {
    return window.IPC.invoke(Channels.CreateProject, {
      name: data.name,
    });
  }

  async reloadProjects() {
    return window.IPC.invoke(Channels.ProjectList);
  }

  @IPCInvokeValidate(SchemaProjectDirectory)
  async projectDirectory(data: { name: string }) {
    return window.IPC.invoke(Channels.ProjectDirectory, data);
  }

  @IPCInvokeValidate(SchemaCreateFolder)
  async createFolder(data: CreateFolderType) {
    return window.IPC.invoke(Channels.CreateFolder, data);
  }

  @IPCInvokeValidate(SchemaUpdateFolder)
  async updateFolder(data: UpdateFolderType) {
    return window.IPC.invoke(Channels.UpdateFolder, data);
  }

  @IPCInvokeValidate(SchemaCreateFile)
  async createFile(data: CreateFileType) {
    return window.IPC.invoke(Channels.CreateFile, data);
  }
}

export const IPCClient = new _IPCClient();
