import { ProjectDialog } from "../components/project-dialog";
import { Toaster } from "@/components/ui/sonner";

export function GlobalComponent() {
  return (
    <>
      <ProjectDialog />
      <Toaster />
    </>
  );
}
