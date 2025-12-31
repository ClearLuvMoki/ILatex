import { ChevronDown, Plus, Projector } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useDialogStore, useProjectStore } from "../store";

export function ProjectSwitcher() {
  const { projects, currentProject, setCurrentProject } = useProjectStore();
  const { setProjectState } = useDialogStore();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-5 items-center justify-center rounded-md">
                <Projector className="size-3" />
              </div>
              {currentProject ? (
                <span className="truncate font-medium">{currentProject.name}</span>
              ) : (
                <span>No Project</span>
              )}
              {currentProject && <ChevronDown className="opacity-50" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg electron-no-drag"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Projects
            </DropdownMenuLabel>
            {projects?.length > 0 ? (
              projects.map((project) => (
                <DropdownMenuItem
                  key={project.name}
                  onClick={() => setCurrentProject(project)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-xs border">
                    <Projector className="size-4 shrink-0" />
                  </div>
                  {project.name}
                </DropdownMenuItem>
              ))
            ) : (
              <span className="text-[12px] text-gray-500 px-2">No projects.</span>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <div
                className="text-muted-foreground font-medium"
                onClick={() => setProjectState(true, null)}
              >
                Add project
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
