import "tui-image-editor/dist/tui-image-editor.css";
import { useCallback, useEffect, useState } from "react";
import { Channels } from "@/src/domains/constant/channels";
import { PageWrapper } from "../../components/page-wrapper";

interface ImageInfoType {
  data: string;
}
export default function MarkdownEditorPage() {
  const [_info, setInfo] = useState<ImageInfoType | null>(null);

  const onInit = useCallback(async () => {
    const viewId = await window.IPC.invoke(`${Channels.RenderGetViewId}`);
    window.IPC.invoke(`${Channels.MarkdownInfo}-${viewId}`).then((data: any) => {
      setInfo(data);
    });
  }, []);

  useEffect(() => {
    onInit();
  }, [onInit]);

  return (
    <PageWrapper className="overflow-hidden flex justify-center items-center">
      <div>12</div>
    </PageWrapper>
  );
}
