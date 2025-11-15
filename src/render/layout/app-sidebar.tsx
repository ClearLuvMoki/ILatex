import * as React from "react";
import { FolderPlus, FilePlusCorner } from "lucide-react";
import { ProjectSwitcher } from "@/components/project-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { FolderTree } from "@/components/folder-tree";
import { Button } from "@/components/ui/button";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0 electron-drag" variant="floating" {...props}>
      <SidebarHeader className="mt-8 electron-no-drag py-0">
        <ProjectSwitcher />
        <div className="flex gap-2 px-1.5 justify-end">
          <Button size="icon-sm" variant="ghost">
            <FolderPlus size={14} className="text-gray-500" />
          </Button>
          <Button size="icon-sm" variant="ghost">
            <FilePlusCorner size={14} className="text-gray-500" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-1.5">
        <FolderTree tree={[]} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
