import "tui-image-editor/dist/tui-image-editor.css";
import { useCallback, useEffect, useState } from "react";
import { Channels } from "@/src/domains/constant/channels";
import { PageWrapper } from "../../components/page-wrapper";

interface ImageInfoType {
  url: string;
}
export default function ImageEditorPage() {
  const [info, setInfo] = useState<ImageInfoType | null>(null);

  const onInit = useCallback(async () => {
    const viewId = await window.IPC.invoke(`${Channels.RenderGetViewId}`);
    window.IPC.invoke(`${Channels.ImageInfo}-${viewId}`).then((data: any) => {
      setInfo(data);
      const blob = new Blob([data.buffer as any]);
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.src = url;
      setInfo({ url });
    });
  }, []);

  useEffect(() => {
    onInit();
  }, [onInit]);

  return (
    <PageWrapper className="overflow-hidden flex justify-center items-center">
      <img src={info?.url} className="w-1/2 h-auto" alt="_picture" />
    </PageWrapper>
  );
}
