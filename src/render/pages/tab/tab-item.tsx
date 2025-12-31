import clsx from "clsx";
import { X } from "lucide-react";
import { Channels } from "@/src/domains/constant/channels";
import { UIConstant } from "@/src/domains/constant/ui";
import type { TabType } from "@/src/domains/types";

export function TabItem(props: TabType) {
  const onSelect = (id: number) => {
    window.IPC.invoke(Channels.SelectTab, id);
  };

  return (
    <div
      className={clsx(
        "rounded-lg px-4 py-1 flex items-center text-gray-600 select-none cursor-pointer translation-all",
        {
          "bg-white": props.isSelected,
          "bg-gray-50/70": !props.isSelected,
        },
      )}
      style={{
        height: UIConstant.TabHeight,
      }}
      onClick={() => onSelect(props.id)}
    >
      <div className="text-xs flex gap-2 justify-between items-center">
        <span>{props.title}</span>
        {props?.isSelected && (
          <span className="mt-0.5">
            {props.isEditing ? (
              <div className="w-2 h-2 bg-gray-300 rounded-full" />
            ) : (
              <X size={14} />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
