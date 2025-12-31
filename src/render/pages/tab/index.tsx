import { useCallback, useEffect, useState } from "react";
import { Channels } from "@/src/domains/constant/channels";
import { UIConstant } from "@/src/domains/constant/ui";
import { TabItem } from "./tab-item";
import { TypstActions } from "./typst-action";

export default function TabPage() {
  const [tabs, setTabs] = useState<any[]>([]);

  const onGetTabs = useCallback(() => {
    return window.IPC.invoke(Channels.AllTabs).then((res) => {
      setTabs(res || []);
    });
  }, []);

  const onListenTabChange = useCallback(() => {
    window.IPC.on(Channels.TabChangeListen, (_, res) => {
      setTabs(res || []);
    });
  }, []);

  useEffect(() => {
    onGetTabs().finally(onListenTabChange);
  }, [onGetTabs, onListenTabChange]);

  return (
    <div
      className="flex gap-2 items-center justify-between w-full"
      style={{
        height: UIConstant.TabHeight,
      }}
    >
      <div className="flex gap-2 items-center">
        {tabs.map((tab) => (
          <TabItem key={tab.id} {...tab} />
        ))}
      </div>
      <TypstActions tabs={tabs} />
    </div>
  );
}
