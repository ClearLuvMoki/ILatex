import { TypstEditor } from "../components/editor/codemirror/typst";

export function AppContent() {
  return (
    <div className="flex-1 p-2">
      <div className="h-full rounded-xl overflow-hidden">
        <TypstEditor />
      </div>
    </div>
  );
}
