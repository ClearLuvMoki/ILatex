import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { toast } from "sonner";
import { SchemaCreateProject } from "@/validate/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useDialogStore, useProjectStore } from "../store";

export function ProjectDialog() {
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
    <Dialog open={projectState.open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
            <DialogFooter>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
