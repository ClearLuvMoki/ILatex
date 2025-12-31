import { PageWrapper } from "../../components/page-wrapper";
import { SidebarProvider } from "../../components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { GlobalComponent } from "./global-component";

export default function Sider() {
  return (
    <PageWrapper>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "19rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <GlobalComponent />
      </SidebarProvider>
    </PageWrapper>
  );
}
