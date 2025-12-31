import { useCallback, useEffect, useRef, useState } from "react";
import { Channels } from "@/src/domains/constant/channels";
import { TypstEditor } from "../../components/editor/codemirror";
import { PageWrapper } from "../../components/page-wrapper";

export default function CodeEditor() {
  const [filePath, setFilePath] = useState<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const getInfo = async () => {
      const viewId = await window.IPC.invoke(Channels.RenderGetViewId);
      window.IPC.invoke(`${Channels.TypstGetInfo}-${viewId}`).then((info: any) => {
        setFilePath(info?.path);
      });
    };
    getInfo();
  }, []);

  const onUpdate = useCallback(async (content: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const viewId = await window.IPC.invoke(Channels.RenderGetViewId);
      await window.IPC.invoke(`${Channels.WriteFile}-${viewId}`, { text: content });
    }, 1000);
  }, []);

  const onSave = useCallback(
    async (content: string) => {
      if (loading) return;
      const viewId = await window.IPC.invoke(Channels.RenderGetViewId);
      setLoading(true);
      return window.IPC.invoke(`${Channels.TypstSaveFile}-${viewId}`, {
        path: filePath,
        text: content,
      })
        .then(() => {
          return window.IPC.invoke(`${Channels.TypstCompile}-${viewId}`, { format: "pdf" });
        })
        .finally(() => setLoading(false));
    },
    [filePath, loading],
  );

  return (
    <PageWrapper className="[&>div]:h-full">
      <TypstEditor onUpdate={onUpdate} onSave={onSave} />
    </PageWrapper>
  );
}
