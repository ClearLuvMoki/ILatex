import { FileSheet } from "@/components/file-sheet";
import { FolderSheet } from "@/components/folder-sheet";
import { ProjectSheet } from "@/components/project-sheet";
import { Toaster } from "@/components/ui/sonner";

export function GlobalComponent() {
  return (
    <>
      <Toaster />
      <ProjectSheet />
      <FolderSheet />
      <FileSheet />
    </>
  );
}
