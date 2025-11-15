import { AppSidebar } from "./app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { GlobalComponent } from "./global-component";

export function Layout() {
  return (
    <div className="flex flex-nowrap">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "19rem",
          } as React.CSSProperties
        }
      >
        <GlobalComponent />
        <AppSidebar />
      </SidebarProvider>
    </div>
  );
}
