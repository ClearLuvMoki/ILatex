import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { SchemaCreateProject } from "@/validate/schema";
import { useDialogStore, useProjectStore } from "../store";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet";

export function ProjectSheet() {
  const { createProject, reloadProjects } = useProjectStore();
  const { projectState, setProjectState } = useDialogStore();

  const form = useForm<z.infer<typeof SchemaCreateProject>>({
    resolver: zodResolver(SchemaCreateProject),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(values: z.infer<typeof SchemaCreateProject>) {
    createProject(values.name)
      .then(() => {
        reloadProjects();
        form.reset();
        onClose();
        toast.success("Create success!");
      })
      .catch(() => {
        toast.error("Create failed!");
      });
  }

  function onClose() {
    setProjectState(false, null);
  }

  return (
    <Sheet open={projectState.open} onOpenChange={onClose}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Create project</SheetTitle>
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
                    <Input placeholder="Please enter project name" {...field} />
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
