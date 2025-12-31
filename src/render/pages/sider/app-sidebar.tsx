import { FilePlusCorner, FolderPlus } from "lucide-react";
import type * as React from "react";
import { FolderTree } from "@/components/folder-tree";
import { ProjectSwitcher } from "@/components/project-switcher";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { useDialogStore, useProjectStore } from "../../store";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentProject, tree } = useProjectStore();
  const { setFolderState, setFileState } = useDialogStore();

  const onCreateFolder = () => {
    setFolderState(true, {
      parentPath: currentProject?.name,
    });
  };

  const onCreateFile = () => {
    setFileState(true, {
      parentPath: currentProject?.name,
    });
  };

  return (
    <Sidebar className="border-r-0 electron-drag" variant="floating" {...props}>
      <SidebarHeader className="mt-8 electron-no-drag py-0">
        <ProjectSwitcher />
        {currentProject && (
          <div className="flex gap-2 px-1.5 justify-end">
            <Button size="icon-sm" variant="ghost" onClick={onCreateFolder}>
              <FolderPlus size={14} className="text-gray-500" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={onCreateFile}>
              <FilePlusCorner size={14} className="text-gray-500" />
            </Button>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="px-1.5">
        <FolderTree tree={tree as any} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
