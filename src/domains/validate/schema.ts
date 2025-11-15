import { z } from "zod";

export const SchemaCreateProject = z.object({
  name: z
    .string({ message: "项目名称必须是字符串!" })
    .min(1, { message: "项目名称至少1个字符串" }),
});
