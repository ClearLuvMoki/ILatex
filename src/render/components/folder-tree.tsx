import {
  Brackets,
  ChevronRight,
  File,
  FilePen,
  FilePlusCorner,
  Folder,
  FolderPlus,
  Trash2,
} from "lucide-react";
import { useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from "@/components/ui/sidebar";
import { Channels } from "@/src/domains/constant/channels";
import { useDialogStore, useProjectStore } from "../store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";

interface TreeType {
  name: string;
  parentPath: string;
  isDir: boolean;
  children?: TreeType[];
}

interface Props {
  tree: TreeType[];
}

function TreeNodeContextMenu({
  node,
  isFolder,
  item,
}: {
  node: React.ReactNode;
  isFolder: boolean;
  item: any;
}) {
  const { setFolderState, setFileState } = useDialogStore();

  const acitons = useMemo(() => {
    let _arr = [
      {
        label: "Update Name",
        key: "update_name",
        icon: FilePen,
      },
    ];
    if (isFolder) {
      _arr = _arr.concat([
        {
          label: "Add Folder",
          key: "add_folder",
          icon: FolderPlus,
        },
        {
          label: "Add File",
          key: "add_file",
          icon: FilePlusCorner,
        },
      ]);
    }
    _arr.push({
      label: "Delete",
      key: "delete",
      icon: Trash2,
    });
    return _arr;
  }, [isFolder]);

  const onAction = (type: string) => {
    switch (type) {
      case "update_name": {
        return isFolder ? setFolderState(true, item) : setFileState(true, item);
      }
      case "add_folder": {
        return window.IPC.invoke(Channels.ShowFolder);

        // return setFolderState(true, {
        //   parentPath: `${item?.parentPath}/${item?.name}`
        // })
      }
      case "add_file": {
        return setFileState(true, {
          parentPath: `${item?.parentPath}/${item?.name}`,
        });
      }
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{node}</ContextMenuTrigger>
      <ContextMenuContent className="w-40 electron-no-drag">
        {acitons.map((item) => {
          return (
            <ContextMenuItem key={item?.key} onClick={() => onAction(item?.key)}>
              <item.icon />
              {item?.label}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FolderTree(props: Props) {
  const { tree } = props;
  const { currentProject } = useProjectStore();

  if (!tree) {
    return (
      <SidebarMenuButton className="text-gray-500">
        <Brackets />
        <span>No files.</span>
      </SidebarMenuButton>
    );
  }

  const onOpenFile = (project: string, file: string) => {
    window.IPC.invoke(Channels.OpenFile, { project, file });
  };

  return (
    <SidebarMenuItem className="electron-no-drag">
      {tree.map((item: any) => {
        return !item?.children ? (
          <TreeNodeContextMenu
            key={`${item?.parentPath}/${item?.name}`}
            isFolder={false}
            item={item}
            node={
              <SidebarMenuButton
                key={`${item?.parentPath}/${item?.name}`}
                className="data-[active=true]:bg-transparent"
                onDoubleClick={() =>
                  onOpenFile(currentProject?.name || "", `${item?.parentPath}/${item?.name}`)
                }
              >
                <File />
                {item?.name}
              </SidebarMenuButton>
            }
          />
        ) : (
          <Collapsible
            key={`${item?.parentPath}/${item?.name}`}
            className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
            defaultOpen
          >
            <CollapsibleTrigger asChild>
              <TreeNodeContextMenu
                isFolder={true}
                item={item}
                node={
                  <SidebarMenuButton>
                    <ChevronRight className="transition-transform" />
                    <Folder />
                    {item?.name}
                  </SidebarMenuButton>
                }
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <FolderTree tree={item?.children} />
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </SidebarMenuItem>
  );
}
