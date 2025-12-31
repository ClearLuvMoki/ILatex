import { EditorView } from "codemirror";

export const TypstTheme = EditorView.theme({
  ".cm-tooltip-autocomplete li": {
    borderRadius: "6px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  ".cm-tooltip-autocomplete li[aria-selected]": {
    backgroundColor: "rgb(36,122,255) !important",
  },
});
