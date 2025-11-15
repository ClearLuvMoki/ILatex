import type { IpcMainInvokeEvent } from "electron";
import z, { ZodTypeAny } from "zod";
import { IPCError } from "./error";

export function IPCInvokeValidate<T extends ZodTypeAny>(schema: T) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const fn = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const result = schema.safeParse(args[0]);
      if (!result.success) {
        return Promise.reject(JSON.parse(result.error.message)?.[0]?.message);
      }
      args[0] = result.data;
      try {
        const ret = fn.apply(this, args);
        return Promise.resolve(ret);
      } catch (err) {
        return Promise.reject(err);
      }
    };

    return descriptor;
  };
}

export function withIPCValidate<T extends z.ZodTypeAny>(
  schema: T,
  handler: (event: IpcMainInvokeEvent, data: z.infer<T>) => any | Promise<any>,
) {
  return (event: IpcMainInvokeEvent, data: any) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      return Promise.reject(JSON.parse(result.error.message)?.[0]?.message);
    }
    return handler(event, result.data);
  };
}
