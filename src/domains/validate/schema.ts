import { z } from "zod";

export const SchemaCreateProject = z.object({
  name: z.string({ message: "项目名称必须是字符串!" }).min(1, { message: "项目名称至少1个字符串" }),
});

export const SchemaProjectDirectory = z.object({
  name: z.string({ message: "项目名称必须是字符串!" }),
});

export const SchemaCreateFolder = z.object({
  name: z
    .string({ message: "文件夹名称必须是字符串!" })
    .min(1, { message: "文件夹名称至少1个字符串" }),
  parentPath: z.string({ message: "文件夹的路径必须是字符串!" }),
});

export const SchemaUpdateFolder = z.object({
  name: z
    .string({ message: "文件夹名称必须是字符串!" })
    .min(1, { message: "文件夹名称至少1个字符串" }),
  parentPath: z.string({ message: "文件夹的路径必须是字符串!" }),
  oldName: z.string({ message: "旧文件夹的名称必须是字符串!" }),
});

export const SchemaCreateFile = z.object({
  name: z
    .string({ message: "文件夹名称必须是字符串!" })
    .min(1, { message: "文件夹名称至少1个字符串" }),
  parentPath: z.string({ message: "文件夹的路径必须是字符串!" }),
});
