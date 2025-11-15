import { IPCInvokeValidate } from "@/validate/ipc";
import { SchemaCreateProject } from "@/validate/schema";
import { Channels } from "@/constant/channels";
import { z } from "zod";

export type CreateProject = z.infer<typeof SchemaCreateProject>;

class _IPCClient {
  @IPCInvokeValidate(SchemaCreateProject)
  async createProject(data: CreateProject) {
    return window.IPC.invoke(Channels.CreateProject, {
      name: data.name,
    });
  }

  async reloadProjects() {
    return window.IPC.invoke(Channels.ProjectList);
  }
}

export const IPCClient = new _IPCClient();
