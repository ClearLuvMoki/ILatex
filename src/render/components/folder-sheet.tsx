import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { SchemaCreateProject } from "@/validate/schema";
import { IPCClient, useDialogStore, useProjectStore } from "../store";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet";

export function FolderSheet() {
  const { folderState, setFolderState } = useDialogStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const isUpdate = useMemo(() => folderState?.data?.name, [folderState?.data?.name]);

  const form = useForm<z.infer<typeof SchemaCreateProject>>({
    resolver: zodResolver(SchemaCreateProject),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (folderState?.open && isUpdate) {
      form.setValue("name", folderState?.data?.name ?? "");
    } else if (!folderState?.open) {
      form.reset();
    }
  }, [folderState, isUpdate, form.reset, form.setValue]);

  function onSubmit(values: { name: string }) {
    const fn: any = isUpdate ? IPCClient.updateFolder : IPCClient.createFolder;
    fn({
      name: values.name,
      parentPath: folderState?.data?.parentPath ?? "",
      oldName: folderState?.data?.name ?? "",
    })
      .then(() => {
        setFolderState(false, null);
        setCurrentProject(currentProject);
        toast.success(`${isUpdate ? "Update" : "Create"} folder success!`);
      })
      .catch(() => {
        toast.error(`${isUpdate ? "Update" : "Create"} folder fail!`);
      });
  }

  function onClose() {
    setFolderState(false, null);
  }

  return (
    <Sheet open={folderState.open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-lg">
        <SheetHeader>
          <SheetTitle>{isUpdate ? "Update" : "Create"} folder</SheetTitle>
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
                    <Input placeholder="Please enter folder name" {...field} />
                  </FormControl>
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
