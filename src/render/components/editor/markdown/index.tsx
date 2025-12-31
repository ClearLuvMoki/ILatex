import Markdown from "react-markdown";

export function MarkdownRenderer({ children }: { children: string }) {
  return <Markdown>{children}</Markdown>;
}
