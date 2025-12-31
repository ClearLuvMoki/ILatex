import clsx from "clsx";

export function ErrorTooltip({ message, level }: { message: string; level: number }) {
  return (
    <div
      className={clsx("shadow-md px-2 py-1 text-xs ", {
        "text-rose-700 bg-gray-100": level === 1,
        "text-yellow-700 bg-yellow-100": level === 2,
        "text-green-700 bg-green-100": level === 3,
      })}
    >
      {message}
    </div>
  );
}
