import {Brackets, Folder, ChevronRight} from "lucide-react"
import {FolderTypes} from "@/types/index";
import {SidebarMenuButton, SidebarMenuItem, SidebarMenuSub} from "@/components/ui/sidebar";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";

interface  Props {
    tree: FolderTypes[]
}
export function FolderTree(props: Props) {
    const {tree} = props;


    if (!tree.length) {
        return (
            <SidebarMenuButton
                className="text-gray-500"
            >
                <Brackets />
                <span>No files.</span>
            </SidebarMenuButton>
        )
    }

    return <SidebarMenuItem>
        <Collapsible
            className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        >
            <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                    <ChevronRight className="transition-transform" />
                    <Folder />
                </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <SidebarMenuSub>
                    {tree.map((subItem, index) => (
                        <FolderTree key={index} tree={subItem?.children} />
                    ))}
                </SidebarMenuSub>
            </CollapsibleContent>
        </Collapsible>
    </SidebarMenuItem>

}