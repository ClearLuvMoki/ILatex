import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  className?: string;
  children: ReactNode;
}
export function PageWrapper({ children, className }: Props) {
  return (
    <div
      className={clsx(
        "w-full h-full rounded-lg overflow-hidden border bg-white border-gray-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
