import { Play } from "lucide-react";
import { useState } from "react";
import { ButtonGroup } from "@/components/ui/button-group";
import { Spinner } from "@/components/ui/spinner";
import { Channels } from "@/src/domains/constant/channels";
import type { TabType } from "@/src/domains/types";
import { Button } from "../../components/ui/button";

interface Props {
  tabs: TabType[];
}

export function TypstActions(props: Props) {
  const { tabs } = props || {};
  const [loading, setLoading] = useState(false);

  const onRun = () => {
    setLoading(true);
    window.IPC.invoke(`${Channels.TypstCompile}-${tabs[0]?.id}`, { format: "pdf" }).finally(() =>
      setLoading(false),
    );
  };

  return (
    <ButtonGroup className="rounded-xl electon-no-darg">
      <Button variant="outline" size="icon" onClick={onRun} disabled={loading}>
        {loading ? <Spinner /> : <Play />}
      </Button>
    </ButtonGroup>
  );
}
