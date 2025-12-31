import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  startCompletion,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  deleteCharBackward,
  deleteCharForward,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { indentOnInput, indentUnit } from "@codemirror/language";
import { EditorSelection, EditorState, Prec } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { typst } from "codemirror-lang-typst";
import { useCallback, useEffect, useRef } from "react";
import { Channels } from "@/src/domains/constant/channels";
import { typst_lsp_auto_completion } from "./autocomplete";
import {
  createUpdateListener,
  diagnosticsField,
  lspDiagnosticsSubscriber,
  lspHoverExtension,
  lspSemanticScheduler,
  refreshSemanticTokens,
  semanticDecosField,
  setComposing,
} from "./core";

export function TypstEditor({
  onUpdate,
  onSave,
}: {
  onUpdate?: (content: string) => void;
  onSave?: (content: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const onSaveRef = useRef<(content: string) => void>(onSave);
  const onUpdateRef = useRef<(content: string) => void>(onUpdate);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const onInit = useCallback(async () => {
    const viewId = await window.IPC.invoke(Channels.RenderGetViewId);
    window.IPC.invoke(`${Channels.ReadFile}-${viewId}`).then(async (content) => {
      if (viewRef.current) {
        viewRef.current = null;
      }
      const init = await window.IPC.invoke(`${Channels.TypstLSPDidOpen}-${viewId}`);
      const legend =
        init?.capabilities?.semanticTokensProvider?.legend || init?.semanticTokensProvider?.legend;

      const state = EditorState.create({
        doc: content,
        extensions: [
          typst(),
          indentOnInput(),
          history(),
          lineNumbers(),
          highlightActiveLine(),
          EditorView.theme({
            "&": {
              maxWidth: "100%",
            },
            "&.cm-focused": {
              outline: "none",
            },
          }),
          EditorView.lineWrapping,
          Prec.highest(
            keymap.of([
              {
                key: "Mod-s",
                preventDefault: true,
                run: (view) => {
                  onSaveRef?.current?.(view.state.doc.toString());
                  return true;
                },
              },
              {
                key: "Backspace",
                preventDefault: true,
                run: deleteCharBackward,
              },
              {
                key: "Delete",
                preventDefault: true,
                run: deleteCharForward,
              },
            ]),
          ),
          closeBrackets(),
          keymap.of([
            indentWithTab,
            ...defaultKeymap.filter((k) => k.key !== "Enter"),
            ...historyKeymap,
            ...closeBracketsKeymap,
          ]),
          semanticDecosField,
          diagnosticsField,
          autocompletion({
            override: [typst_lsp_auto_completion({ viewId })],
            activateOnTyping: true,
          }),
          keymap.of([
            {
              key: "Enter",
              preventDefault: true,
              run: (view) => {
                const unit = view.state.facet(indentUnit) || "  ";
                const tr = view.state.changeByRange((range) => {
                  const pos = range.head;
                  const line = view.state.doc.lineAt(pos);
                  const before = view.state.doc.sliceString(line.from, pos);
                  const after = view.state.doc.sliceString(pos, line.to);
                  const baseIndent = before.match(/^[ \t]*/)?.[0] ?? "";
                  const lineText = view.state.doc.sliceString(line.from, line.to);
                  const plusAtStart = /^\s*\+(\s|$)/.test(lineText);

                  // 检查是否是匹配的括号对 (简单检查)
                  const lastChar = before.trim().slice(-1);
                  const firstChar = after.trim()[0];
                  const isMatching =
                    (lastChar === "(" && firstChar === ")") ||
                    (lastChar === "[" && firstChar === "]") ||
                    (lastChar === "{" && firstChar === "}");

                  if (isMatching) {
                    const innerPrefix = plusAtStart ? `${baseIndent + unit}- ` : baseIndent + unit;
                    const insert = `\n${innerPrefix}\n${baseIndent}`;
                    const caret = pos + 1 + innerPrefix.length;
                    return {
                      changes: { from: pos, to: pos, insert },
                      range: EditorSelection.cursor(caret),
                    };
                  }
                  const openBefore = /[{([]\s*$/.test(before);
                  const hasAfterText = after.trim().length > 0;
                  const nextIndent = plusAtStart
                    ? openBefore
                      ? `${baseIndent + unit}- `
                      : `${baseIndent}+ `
                    : hasAfterText && !openBefore
                      ? ""
                      : baseIndent + (openBefore ? unit : "");
                  const insert = `\n${nextIndent}`;
                  return {
                    changes: { from: pos, to: pos, insert },
                    range: EditorSelection.cursor(pos + insert.length),
                  };
                });
                view.dispatch(tr, { userEvent: "input" });
                return true;
              },
            },
          ]),
          // signatureHelpDriver({
          //   viewId
          // }),
          lspSemanticScheduler(legend),
          lspDiagnosticsSubscriber(),
          lspHoverExtension(),
          createUpdateListener({
            viewId,
            onUpdateRef: onUpdateRef.current,
            startCompletion,
          }),
          EditorView.updateListener.of((vu) => {
            if (vu.docChanged && !vu.view.composing) {
              const text = vu.state.doc.toString();
              window.IPC.invoke(`${Channels.TypstLSPDidChange}-${viewId}`, { text });
              onUpdateRef?.current?.(text);

              // 检查是否是换行操作 (检测变化中是否包含换行符)
              const isNewLine = vu.transactions.some(
                (tr) => tr.isUserEvent("input") && tr.newDoc.lines > tr.startState.doc.lines,
              );

              if (isNewLine) {
                const head = vu.state.selection.main.head;
                const currentLine = vu.state.doc.lineAt(head);
                const prevLineNo = Math.max(1, currentLine.number - 1);
                const prevLine = vu.state.doc.line(prevLineNo);
                const prevText = vu.state.sliceDoc(prevLine.from, prevLine.to);
                const trimmed = prevText.replace(/[ \t]+$/g, "");
                if (trimmed.length !== prevText.length) {
                  vu.view.dispatch({
                    changes: {
                      from: prevLine.from,
                      to: prevLine.to,
                      insert: trimmed,
                    },
                  });
                }
                setTimeout(() => {
                  startCompletion(vu.view);
                }, 50);
              }
            }
          }),
          EditorView.domEventHandlers({
            compositionstart: () => {
              setComposing(true);
            },
            compositionend: (_e, view) => {
              setComposing(false);
              setTimeout(() => {
                const text = view.state.doc.toString();
                window.IPC.invoke(`${Channels.TypstLSPDidChange}-${viewId}`, { text });
                startCompletion(view);
                onUpdateRef?.current?.(text);
              }, 0);
            },
            blur: () => {
              setComposing(false);
            },
          }),
        ],
      });

      viewRef.current = new EditorView({
        state,
        parent: ref.current!,
      });

      if (legend) {
        await refreshSemanticTokens(viewRef.current, legend);
      }
    });
    return () => {
      viewRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    onInit();
    return () => {
      setComposing(false);
    };
  }, [onInit]);

  return <div ref={ref} className="bg-white rounded-md p-2" />;
}
