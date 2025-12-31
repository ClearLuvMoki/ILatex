import { useSetState } from "ahooks";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Channels } from "@/src/domains/constant/channels";
import { PageWrapper } from "../../components/page-wrapper";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { useQuery } from "../../hooks/use-query";

const collapsibleTriggerClassName =
  "w-full flex justify-start gap-2 items-center rounded-lg p-2 hover:bg-gray-200 cursor-pointer text-sm";

export default function PreviewPage() {
  const query = useQuery();
  const url = query.get("url");
  const [buffer, setBuffer] = useState<any>("");
  const [error, setError] = useState<string>("");
  const [open, setOpen] = useSetState<{
    preview: boolean;
    logs: boolean;
  }>({
    preview: false,
    logs: false,
  });

  useEffect(() => {
    if (url) {
      const _buffer = window.IPC.onReadPathToBuffer(url);
      // @ts-expect-error
      const blob = new Blob([_buffer], { type: "application/pdf" });
      setBuffer(URL.createObjectURL(blob));
      setOpen({ preview: true });
    }
    window.IPC.on(Channels.TypstCompileError, (_, msg) => {
      setError(msg);
      setOpen({ logs: true, preview: false });
    });
  }, [url, setOpen]);

  return (
    <PageWrapper>
      <Collapsible
        className="w-full"
        open={open.preview}
        onOpenChange={(isOpen) => setOpen({ preview: isOpen })}
      >
        <CollapsibleTrigger
          className={clsx(collapsibleTriggerClassName, {
            "bg-gray-400": open.preview,
          })}
        >
          <ChevronDown
            className={clsx("w-4 h-4 transition-transform duration-200", {
              "-rotate-90": !open.preview,
            })}
          />
          Preview
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/** biome-ignore lint/a11y/useIframeTitle: <iframe error message> */}
          <iframe
            src={buffer}
            className="w-full"
            style={{
              height: 500,
            }}
          />
        </CollapsibleContent>
      </Collapsible>
      <Collapsible open={open.logs} onOpenChange={(isOpen) => setOpen({ logs: isOpen })}>
        <CollapsibleTrigger
          className={clsx(collapsibleTriggerClassName, {
            "bg-gray-200": open.logs,
          })}
        >
          <ChevronDown
            className={clsx("w-4 h-4 transition-transform duration-200", {
              "-rotate-90": !open.logs,
            })}
          />
          Logs
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div
            className="px-2 text-gray-600 wrap-break-word w-full break-all"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {error || "No logs"}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </PageWrapper>
  );
}
