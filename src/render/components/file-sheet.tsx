import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { SchemaCreateProject } from "@/validate/schema";
import { IPCClient, useDialogStore, useProjectStore } from "../store";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet";

export function FileSheet() {
  const { fileState, setFileState } = useDialogStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const isUpdate = useMemo(() => fileState?.data?.name, [fileState?.data?.name]);

  const form = useForm<z.infer<typeof SchemaCreateProject>>({
    resolver: zodResolver(SchemaCreateProject),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (fileState?.open && isUpdate) {
      form.setValue("name", fileState?.data?.name ?? "");
    } else if (!fileState?.open) {
      form.reset();
    }
  }, [fileState, isUpdate, form.reset, form.setValue]);

  function onSubmit(values: { name: string }) {
    const fn: any = isUpdate ? IPCClient.updateFolder : IPCClient.createFile;
    fn({
      name: values.name,
      parentPath: fileState?.data?.parentPath ?? "",
      oldName: fileState?.data?.name ?? "",
    })
      .then(() => {
        setFileState(false, null);
        setCurrentProject(currentProject);
        toast.success(`${isUpdate ? "Update" : "Create"} folder success!`);
      })
      .catch(() => {
        toast.error(`${isUpdate ? "Update" : "Create"} folder fail!`);
      });
  }

  function onClose() {
    setFileState(false, null);
  }

  return (
    <Sheet open={fileState.open} onOpenChange={onClose}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{isUpdate ? "Update" : "Create"} file</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Please enter file name" {...field} />
                  </FormControl>
                  <FormDescription>
                    If there is no file extension, it will end with .txt.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="px-0">
              <Button type="submit">Submit</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
