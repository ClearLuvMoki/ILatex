import { snippetCompletion } from "@codemirror/autocomplete";
import {
  Annotation,
  type EditorState,
  type Extension,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  hoverTooltip,
  showTooltip,
  type Tooltip,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import React from "react";
import ReactDOM from "react-dom/client";
import { MarkdownRenderer } from "@/components/editor/markdown";
import { ErrorTooltip } from "@/components/editor/tooltip/error-tootip";
import { Channels } from "@/domains/constant/channels";
import { onTransformSignature } from "./autocomplete";

let isComposing = false;
export function setComposing(c: boolean) {
  isComposing = c;
}

type Legend = { tokenTypes: string[]; tokenModifiers: string[] };
type Diagnostic = {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  message: string;
  severity: number;
};

function markFor(type: string) {
  return Decoration.mark({ class: `lsp_typst_type_${type}` });
}

export const semanticDecosField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decos, tr) {
    if (tr.docChanged) {
      // Keep existing decorations; semantic refresh will replace them
      return decos.map(tr.changes);
    }
    const ann = tr.annotation(semanticUpdateAnn);
    if (ann) return ann;
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const semanticUpdateAnn = Annotation.define<DecorationSet>();
const diagnosticsUpdateAnn = Annotation.define<{ set: DecorationSet; diags: Diagnostic[] }>();

export const diagnosticsField = StateField.define<{ set: DecorationSet; diags: Diagnostic[] }>({
  create() {
    return { set: Decoration.none, diags: [] };
  },
  update(value, tr) {
    if (tr.docChanged) {
      return { set: value.set.map(tr.changes), diags: value.diags }; // Note: diags positions become stale on edit, but will be refreshed by LSP
    }
    const ann = tr.annotation(diagnosticsUpdateAnn);
    if (ann) return ann;
    return value;
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.set),
});

export const diagnosticsDecosField = diagnosticsField; // Alias for backward compatibility if needed, but we used provide above.

export async function refreshSemanticTokens(view: EditorView, legend: Legend) {
  if (view.composing) return;
  const currentDoc = view.state.doc;
  const viewId = await window.IPC.invoke(Channels.RenderGetViewId);
  const res = await window.IPC.invoke(`${Channels.TypstLSPSemanticTokensFull}-${viewId}`);
  if (view.state.doc !== currentDoc) return;

  const data: number[] = res?.data ?? res?.result?.data ?? [];
  if (!Array.isArray(data) || data.length === 0) {
    view.dispatch({ annotations: semanticUpdateAnn.of(Decoration.none) });
    return;
  }

  const ranges: { from: number; to: number; deco: Decoration }[] = [];
  let line = 0;
  let char = 0;

  for (let i = 0; i + 4 < data.length; i += 5) {
    const dLine = data[i];
    const dStart = data[i + 1];
    const length = data[i + 2];
    const tokenTypeIndex = data[i + 3];
    const tokenType = legend.tokenTypes[tokenTypeIndex] ?? "raw";
    if (dLine === 0) {
      char += dStart;
    } else {
      line += dLine;
      char = dStart;
    }
    // Prevent semantic tokens from exceeding the document range
    if (line >= view.state.doc.lines) continue;
    const cmLine = view.state.doc.line(line + 1);
    const from = Math.min(cmLine.from + char, cmLine.to);
    const to = Math.min(from + length, cmLine.to);

    if (from < to) {
      ranges.push({ from, to, deco: markFor(tokenType) });
    }
  }

  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  const set = Decoration.set(
    ranges.map((r) => r.deco.range(r.from, r.to)),
    true,
  );
  view.dispatch({ annotations: semanticUpdateAnn.of(set) });
}

export function applyDiagnostics(view: EditorView, params: any) {
  const diags: Diagnostic[] = Array.isArray(params?.diagnostics) ? params.diagnostics : [];
  if (!diags.length) {
    view.dispatch({
      annotations: diagnosticsUpdateAnn.of({ set: Decoration.none, diags: [] }),
    });
    return;
  }
  const ranges: any[] = [];
  for (const d of diags) {
    const r = d?.range;
    if (!r) continue;
    const from = offsetAt(view.state, r.start);
    const to = Math.max(from + 1, offsetAt(view.state, r.end));
    // Ensure diagnostic range does not exceed document length
    if (from < view.state.doc.length) {
      const validTo = Math.min(to, view.state.doc.length);
      ranges.push(Decoration.mark({ class: "lsp_typst_type_error" }).range(from, validTo));
    }
  }
  const set = Decoration.set(ranges, true);
  view.dispatch({ annotations: diagnosticsUpdateAnn.of({ set, diags }) });
}

export function lspHoverExtension(): Extension {
  return hoverTooltip(async (view, pos) => {
    const diagState = view.state.field(diagnosticsField);
    const diag = diagState.diags.find((d) => {
      const start = offsetAt(view.state, d.range.start);
      const end = offsetAt(view.state, d.range.end);
      return pos >= start && pos <= end;
    });

    if (diag) {
      return {
        pos,
        end: offsetAt(view.state, diag.range.end),
        above: true,
        create() {
          const dom = document.createElement("div");
          const root = ReactDOM.createRoot(dom);
          root.render(
            React.createElement(ErrorTooltip, { message: diag.message, level: diag.severity }),
          );
          return {
            dom,
            destroy() {
              root.unmount();
            },
          };
        },
      };
    }

    const line = view.state.doc.lineAt(pos);
    const position = { line: line.number - 1, character: pos - line.from };
    const viewId = await window.IPC.invoke(Channels.RenderGetViewId);
    const res = await window.IPC.invoke(`${Channels.TypstLSPHover}-${viewId}`, { position });
    const contents = res?.contents;

    if (!contents) return null;

    let markdown = "";
    if (typeof contents === "string") {
      markdown = contents;
    } else if (Array.isArray(contents)) {
      markdown = contents.map((c) => (typeof c === "string" ? c : c.value)).join("\n\n");
    } else if (contents.kind === "markdown" || contents.kind === "plaintext") {
      markdown = contents.value;
    }

    if (!markdown) return null;

    return {
      pos,
      create() {
        const dom = document.createElement("div");
        dom.className = "max-h-[300px] max-w-[400px] overflow-auto text-xs p-2";
        const root = ReactDOM.createRoot(dom);
        root.render(React.createElement(MarkdownRenderer, null, markdown));
        return {
          dom,
          destroy() {
            root.unmount();
          },
        };
      },
    };
  });
}

export type LspPosition = { line: number; character: number };
export function cmOffsetToLspPos(state: EditorState, offset: number): LspPosition {
  const line = state.doc.lineAt(offset);
  return {
    line: line.number - 1,
    character: offset - line.from, // 列号
  };
}

export function lspPosToCmOffset(state: EditorState, pos: LspPosition): number {
  const line = state.doc.line(pos.line + 1);
  return Math.min(line.to + 1, line.from + pos.character);
}

type BeforeMatch = { from: number; to: number; text: string } | null;
export function findPrevNonWhitespaceToken(
  state: any,
  pos: number,
  tokenCharRe: RegExp = /[A-Za-z0-9_\-./:#()]/,
): BeforeMatch {
  const doc = state.doc;
  let i = pos;

  const isWs = (ch: string) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";

  // 1) 往左跳过空白 + 非 token 标点（直到遇到 token 字符）
  while (i > 0) {
    const ch = doc.sliceString(i - 1, i);
    if (isWs(ch)) {
      i--;
      continue;
    }
    if (!tokenCharRe.test(ch)) {
      // 关键：跳过 '(' ',' ')' 等非 token 字符
      i--;
      continue;
    }
    break; // 找到 token 字符了
  }

  if (i <= 0) return null;

  // 2) 从 i 往左吃完整 token
  let start = i;
  while (start > 0) {
    const ch = doc.sliceString(start - 1, start);
    if (!tokenCharRe.test(ch)) break;
    start--;
  }

  const text = doc.sliceString(start, i);
  return text ? { from: start, to: i, text } : null;
}

function guessCallContextAt(state: EditorState, pos: number) {
  const before = state.doc.sliceString(Math.max(0, pos - 200), pos);
  const i = before.lastIndexOf("(");
  if (i < 0) return null;
  const head = before.slice(0, i);
  const m = head.match(/#?([A-Za-z_][\w-]*)\s*$/);
  if (!m) return null;
  const inside = before.slice(i + 1);
  const paramIndex = inside.split(",").length - 1;
  return { fnName: m[1], paramIndex };
}

export function lspCompletionSource(): any {
  return async (ctx: any) => {
    if (isComposing) return null;
    const pos = ctx.pos;
    const viewId = await window.IPC.invoke(Channels.RenderGetViewId);
    const triggerCharacter = ctx.explicit ? undefined : ctx.state.doc.sliceString(pos - 1, pos);
    const before = findPrevNonWhitespaceToken(ctx.state, pos, /[A-Za-z0-9_\-./:#()]/);
    const position = cmOffsetToLspPos(ctx.state, before ? before.to : pos);
    const word = (ctx as any).matchBefore?.(/^[-A-Za-z0-9_./:#]*/) ?? null;
    const from = word ? word.from : ctx.pos;
    const resp = await window.IPC.invoke(`${Channels.TypstLSPSignatureHelp}-${viewId}`, {
      position,
      triggerCharacter,
    });
    const info = formatSignature(resp);
    // console.log(info, resp, word?.text, "12");
    if (info?.paramLabel) {
      return {
        from,
        options: [
          {
            label: onTransformSignature(info, "figure") || "",
            detail: info?.doc,
          },
        ],
        validFor: /^[-A-Za-z0-9_./:#()]*$/,
      };
    }
    const res = await window.IPC.invoke(`${Channels.TypstLSPCompletion}-${viewId}`, {
      position,
      triggerCharacter,
    });
    const itemsRaw = (Array.isArray(res) ? res : res?.items) ?? [];
    // console.log(before, position, res, itemsRaw, "items");
    if (!itemsRaw.length) return null;
    const callCtx = guessCallContextAt(ctx.state, pos);
    const isParamItem = (it: any) => {
      const insert = it?.textEdit?.newText ?? it?.insertText ?? it?.label ?? "";
      const label = it?.label ?? insert;
      const detail =
        it?.detail ??
        (typeof (it as any)?.documentation === "string"
          ? (it as any).documentation
          : (it as any)?.documentation?.value) ??
        "";
      const kind = mapCompletionKind(it?.kind);
      const hasColon = /:/.test(insert) || /:$/.test(label);
      return (
        hasColon ||
        /\bparam\b|\bargument\b/i.test(detail) ||
        kind === "property" ||
        kind === "field"
      );
    };
    const items = callCtx ? itemsRaw.filter(isParamItem) : itemsRaw;
    if (!items.length) return null;

    const matchText = ctx.state.sliceDoc(from, ctx.pos);
    const prefix = matchText.match(/^(@|#)/)?.[0];
    const options: any[] = [];
    for (const it of items) {
      let insert = it?.textEdit?.newText ?? it?.insertText ?? it?.label ?? "";
      let label = it?.label ?? insert;
      let range = it?.textEdit?.range;
      const secondary =
        it?.detail ??
        (typeof (it as any)?.documentation === "string"
          ? (it as any).documentation
          : (it as any)?.documentation?.value) ??
        "";
      if (prefix) {
        if (!label.startsWith(prefix)) {
          label = prefix + label;
        }
        if (!insert.startsWith(prefix)) {
          insert = prefix + insert;
        }
        range = null;
      }
      const kind = mapCompletionKind(it?.kind);
      const isSnippet = it?.insertTextFormat === 2 || kind === "snippet";
      const baseName = label.replace(/^[@#]/, "");
      const hasHash = prefix === "#";
      const customSnippet =
        baseName === "figure"
          ? hasHash
            ? // biome-ignore lint/suspicious/noTemplateCurlyInString: <1>
              '#figure(${1:image("${2:path}")})'
            : // biome-ignore lint/suspicious/noTemplateCurlyInString: <1>
              'figure(${1:image("${2:path}")})'
          : baseName === "image"
            ? hasHash
              ? // biome-ignore lint/suspicious/noTemplateCurlyInString: <1>
                '#image("${1:path}")'
              : // biome-ignore lint/suspicious/noTemplateCurlyInString: <1>
                'image("${1:path}")'
            : null;
      if (!isSnippet && customSnippet) {
        const s = snippetCompletion(customSnippet, { label, type: kind, detail: secondary }) as any;
        const render = (_c: any, _s: any) => {
          const dom = document.createElement("div");
          const icon = document.createElement("span");
          const content = document.createElement("div");
          const title = document.createElement("div");
          const detail = document.createElement("div");
          dom.className = "cm-completionItem";
          icon.className = "cm-completionIcon";
          content.className = "cm-completionContent";
          title.className = "cm-completionLabel";
          detail.className = "cm-completionDetail";
          const iconMap: Record<string, string> = {
            method: "m",
            function: "ƒ",
            constructor: "c",
            field: "f",
            variable: "x",
            class: "C",
            interface: "I",
            module: "M",
            property: "p",
            unit: "u",
            value: "v",
            enum: "E",
            keyword: "K",
            snippet: "S",
            color: "●",
            file: "F",
            reference: "R",
            folder: "D",
            "enum-member": "e",
            constant: "π",
            struct: "S",
            event: "⚑",
            operator: "⊕",
            "type-parameter": "T",
            text: "t",
          };
          icon.textContent = iconMap[kind] || "•";
          title.textContent = label;
          detail.textContent = secondary;
          content.appendChild(title);
          if (detail.textContent) content.appendChild(detail);
          dom.appendChild(icon);
          dom.appendChild(content);
          return dom;
        };
        (s as any).render = render;
        options.push(s);
        continue;
      }
      const render = (_c: any, _s: any) => {
        const dom = document.createElement("div");
        const icon = document.createElement("span");
        const content = document.createElement("div");
        const title = document.createElement("div");
        const detail = document.createElement("div");
        dom.className = "cm-completionItem";
        icon.className = "cm-completionIcon";
        content.className = "cm-completionContent";
        title.className = "cm-completionLabel";
        detail.className = "cm-completionDetail";
        const iconMap: Record<string, string> = {
          method: "m",
          function: "ƒ",
          constructor: "c",
          field: "f",
          variable: "x",
          class: "C",
          interface: "I",
          module: "M",
          property: "p",
          unit: "u",
          value: "v",
          enum: "E",
          keyword: "K",
          snippet: "S",
          color: "●",
          file: "F",
          reference: "R",
          folder: "D",
          "enum-member": "e",
          constant: "π",
          struct: "S",
          event: "⚑",
          operator: "⊕",
          "type-parameter": "T",
          text: "t",
        };
        icon.textContent = iconMap[kind] || "•";
        title.textContent = label;
        detail.textContent = secondary;
        content.appendChild(title);
        if (detail.textContent) content.appendChild(detail);
        dom.appendChild(icon);
        dom.appendChild(content);
        return dom;
      };
      if (isSnippet) {
        const s = snippetCompletion(insert, { label, type: kind, detail: secondary }) as any;
        (s as any).render = render;
        options.push(s);
      } else {
        options.push({
          label,
          apply(view: EditorView, _completion: any, fromPos: number, toPos: number) {
            if (range) {
              const start = offsetAt(view.state, range.start);
              const end = offsetAt(view.state, range.end);
              view.dispatch({ changes: { from: start, to: end, insert } });
            } else {
              view.dispatch({ changes: { from: fromPos, to: toPos, insert } });
            }
          },
          type: kind,
          detail: it?.detail,
          render,
        });
      }
    }
    return {
      from,
      options,
      validFor: /^[-A-Za-z0-9_./:#()]*$/,
    };
  };
  // return async (ctx: any) => {
  //   if (isComposing) return null;
  //   const pos = ctx.pos;
  //   const position = cmOffsetToLspPos(ctx.state, pos);
  //
  //   const triggerCharacter = ctx.explicit ? undefined : ctx.state.doc.sliceString(pos - 1, pos);
  //   console.log(triggerCharacter, 'triggerCharacter')
  //   const res = await window.IPC.invoke(`${Channels.TypstLSPCompletion}-${viewId}`, { position, triggerCharacter });
  //   // If composing started during the await, abort completion to prevent glitches
  //   if (isComposing) return null;
  //
  //   const items = (Array.isArray(res) ? res : res?.items) ?? [];
  //   if (!items.length) return null;
  //
  //   const before = ctx.matchBefore(/[\w\-./]*/);
  //   console.log(before, 'before')
  //   let from = before ? before.from : ctx.pos;
  //
  //   // Check if there is a prefix (@ or #) immediately before the match
  //   const prevChar = ctx.state.sliceDoc(from - 1, from);
  //   console.log(prevChar, 'prevChar')
  //   if (prevChar === "@" || prevChar === "#") {
  //     from -= 1;
  //   }
  //
  //   const matchText = ctx.state.sliceDoc(from, ctx.pos);
  //   const prefix = matchText.match(/^(@|#)/)?.[0];
  //
  //   const options: any[] = [];
  //   for (const it of items) {
  //     let insert = it?.textEdit?.newText ?? it?.insertText ?? it?.label ?? "";
  //     let label = it?.label ?? insert;
  //     let range = it?.textEdit?.range;
  //     const secondary =
  //       it?.detail ??
  //       (typeof (it as any)?.documentation === "string"
  //         ? (it as any).documentation
  //         : (it as any)?.documentation?.value) ??
  //       "";
  //
  //     // Fix: If we matched a prefix (like # or @), we handle the prefix consistency manually.
  //     // We prepend the prefix to label/insert if missing, and we FORCE ignoring the LSP range
  //     // to rely on CodeMirror's matchBefore range. This prevents issues where LSP range
  //     // might cause duplication (e.g. appending instead of replacing the prefix).
  //     if (prefix) {
  //       if (!label.startsWith(prefix)) {
  //         label = prefix + label;
  //       }
  //       if (!insert.startsWith(prefix)) {
  //         insert = prefix + insert;
  //       }
  //       range = null;
  //     }
  //
  //     const kind = mapCompletionKind(it?.kind);
  //     const isSnippet = it?.insertTextFormat === 2 || kind === "snippet";
  //     const baseName = label.replace(/^[@#]/, "");
  //     const hasHash = prefix === "#";
  //     const customSnippet =
  //       baseName === "figure"
  //         ? hasHash
  //           ? '#figure(${1:image("${2:path}")})'
  //           : 'figure(${1:image("${2:path}")})'
  //         : baseName === "image"
  //           ? hasHash
  //             ? '#image("${1:path}")'
  //             : 'image("${1:path}")'
  //           : null;
  //     if (!isSnippet && customSnippet) {
  //       const s = snippetCompletion(customSnippet, { label, type: kind, detail: secondary }) as any;
  //       const render = (_c: any, _s: any) => {
  //         const dom = document.createElement("div");
  //         const icon = document.createElement("span");
  //         const content = document.createElement("div");
  //         const title = document.createElement("div");
  //         const detail = document.createElement("div");
  //         dom.className = "cm-completionItem";
  //         icon.className = "cm-completionIcon";
  //         content.className = "cm-completionContent";
  //         title.className = "cm-completionLabel";
  //         detail.className = "cm-completionDetail";
  //         const iconMap: Record<string, string> = {
  //           method: "m",
  //           function: "ƒ",
  //           constructor: "c",
  //           field: "f",
  //           variable: "x",
  //           class: "C",
  //           interface: "I",
  //           module: "M",
  //           property: "p",
  //           unit: "u",
  //           value: "v",
  //           enum: "E",
  //           keyword: "K",
  //           snippet: "S",
  //           color: "●",
  //           file: "F",
  //           reference: "R",
  //           folder: "D",
  //           "enum-member": "e",
  //           constant: "π",
  //           struct: "S",
  //           event: "⚑",
  //           operator: "⊕",
  //           "type-parameter": "T",
  //           text: "t",
  //         };
  //         icon.textContent = iconMap[kind] || "•";
  //         title.textContent = label;
  //         detail.textContent = secondary;
  //         content.appendChild(title);
  //         if (detail.textContent) content.appendChild(detail);
  //         dom.appendChild(icon);
  //         dom.appendChild(content);
  //         return dom;
  //       };
  //       (s as any).render = render;
  //       options.push(s);
  //       continue;
  //     }
  //
  //     const render = (_c: any, _s: any) => {
  //       const dom = document.createElement("div");
  //       const icon = document.createElement("span");
  //       const content = document.createElement("div");
  //       const title = document.createElement("div");
  //       const detail = document.createElement("div");
  //       dom.className = "cm-completionItem";
  //       icon.className = "cm-completionIcon";
  //       content.className = "cm-completionContent";
  //       title.className = "cm-completionLabel";
  //       detail.className = "cm-completionDetail";
  //       const iconMap: Record<string, string> = {
  //         method: "m",
  //         function: "ƒ",
  //         constructor: "c",
  //         field: "f",
  //         variable: "x",
  //         class: "C",
  //         interface: "I",
  //         module: "M",
  //         property: "p",
  //         unit: "u",
  //         value: "v",
  //         enum: "E",
  //         keyword: "K",
  //         snippet: "S",
  //         color: "●",
  //         file: "F",
  //         reference: "R",
  //         folder: "D",
  //         "enum-member": "e",
  //         constant: "π",
  //         struct: "S",
  //         event: "⚑",
  //         operator: "⊕",
  //         "type-parameter": "T",
  //         text: "t",
  //       };
  //       icon.textContent = iconMap[kind] || "•";
  //       title.textContent = label;
  //       detail.textContent = secondary;
  //       content.appendChild(title);
  //       if (detail.textContent) content.appendChild(detail);
  //       dom.appendChild(icon);
  //       dom.appendChild(content);
  //       return dom;
  //     };
  //     if (isSnippet) {
  //       const s = snippetCompletion(insert, { label, type: kind, detail: secondary }) as any;
  //       s.render = render;
  //       options.push(s);
  //     } else {
  //       options.push({
  //         label,
  //         apply(view: EditorView, _completion: any, fromPos: number, toPos: number) {
  //           if (range) {
  //             const start = offsetAt(view.state, range.start);
  //             const end = offsetAt(view.state, range.end);
  //             view.dispatch({ changes: { from: start, to: end, insert } });
  //           } else {
  //             view.dispatch({ changes: { from: fromPos, to: toPos, insert } });
  //           }
  //         },
  //         type: kind,
  //         detail: it?.detail,
  //         render,
  //       });
  //     }
  //   }
  //   return {
  //     from,
  //     options,
  //     validFor: /^[\w\-./]*$/,
  //   };
  // };
}

function offsetAt(state: any, pos: { line: number; character: number }) {
  const line = Math.max(1, Math.min(state.doc.lines, pos.line + 1));
  const l = state.doc.line(line);
  return Math.min(l.to, l.from + pos.character);
}
function mapCompletionKind(kind: any): string {
  switch (kind) {
    case 2:
      return "method";
    case 3:
      return "function";
    case 4:
      return "constructor";
    case 5:
      return "field";
    case 6:
      return "variable";
    case 7:
      return "class";
    case 8:
      return "interface";
    case 9:
      return "module";
    case 10:
      return "property";
    case 11:
      return "unit";
    case 12:
      return "value";
    case 13:
      return "enum";
    case 14:
      return "keyword";
    case 15:
      return "snippet";
    case 16:
      return "color";
    case 17:
      return "file";
    case 18:
      return "reference";
    case 19:
      return "folder";
    case 20:
      return "enum-member";
    case 21:
      return "constant";
    case 22:
      return "struct";
    case 23:
      return "event";
    case 24:
      return "operator";
    case 25:
      return "type-parameter";
    case 1:
      return "text";
    default:
      return "variable";
  }
}

export function lspSemanticScheduler(legend: Legend): Extension {
  return ViewPlugin.fromClass(
    class {
      private timer: any;
      constructor(readonly view: EditorView) {
        refreshSemanticTokens(view, legend).catch(() => {});
      }
      update(update: ViewUpdate) {
        if (update.docChanged) {
          clearTimeout(this.timer);
          this.timer = setTimeout(() => {
            refreshSemanticTokens(this.view, legend).catch(() => {});
          }, 250);
        }
      }
      destroy() {
        clearTimeout(this.timer);
      }
    },
  );
}

export function lspDiagnosticsSubscriber(): Extension {
  return ViewPlugin.fromClass(
    class {
      private handler: any;
      constructor(readonly view: EditorView) {
        this.handler = (_e: any, params: any) => {
          applyDiagnostics(this.view, params);
        };
        window.IPC.on(Channels.TypstDiagnosticsPush, this.handler);
      }
      destroy() {
        if ((window.IPC as any)?.off) {
          (window.IPC as any)?.off(Channels.TypstDiagnosticsPush, this.handler);
        }
      }
    },
  );
}

export const createUpdateListener = ({
  viewId,
  onUpdateRef,
  startCompletion,
  delay = 300,
}: {
  viewId: string;
  onUpdateRef?: (text: string) => void;
  startCompletion: any;
  delay?: number;
}) => {
  let timer: number | null = null;

  return EditorView.updateListener.of((vu) => {
    if (!vu.docChanged || vu.view.composing) return;

    const text = vu.state.doc.toString();

    if (timer) {
      clearTimeout(timer);
    }

    timer = window.setTimeout(async () => {
      await window.IPC.invoke(`${Channels.TypstLSPDidChange}-${viewId}`, { text });
      await window.IPC.invoke(`${Channels.TypstLSPDidChange}-${viewId}`, { text });
      onUpdateRef?.(text);

      const isNewLine = vu.transactions.some(
        (tr) => tr.isUserEvent("input") && tr.newDoc.lines > tr.startState.doc.lines,
      );

      if (isNewLine) {
        const head = vu.state.selection.main.head;
        const currentLine = vu.state.doc.lineAt(head);
        const prevLine = vu.state.doc.line(Math.max(1, currentLine.number - 1));

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

        startCompletion(vu.view);
      }
    }, delay);
  });
};

function formatSignature(resp: any) {
  if (!resp?.signatures?.length) return null;

  const sig = resp.signatures[resp.activeSignature ?? 0] ?? resp.signatures[0];
  const activeParamIndex = resp.activeParameter ?? 0;

  const label: string = sig.label ?? "";
  const params: any[] = sig.parameters ?? [];
  const param = params[activeParamIndex];

  // 参数名通常在 param.label 里（可能是 string 或 [start,end]）
  let paramLabel = "";
  if (param?.label) {
    if (typeof param.label === "string") paramLabel = param.label;
    else if (Array.isArray(param.label)) paramLabel = label.slice(param.label[0], param.label[1]);
  }

  const doc =
    typeof sig.documentation === "string" ? sig.documentation : (sig.documentation?.value ?? "");

  return { label, activeParamIndex, paramLabel, doc };
}

export function tinymistSignatureTooltip() {
  return StateField.define<Tooltip | null>({
    create() {
      return null;
    },
    update(value, tr) {
      // 光标没动/文档没变就不刷（你可以更激进）
      if (!tr.docChanged && !tr.selection) return value;
      return value; // 先保持，实际更新用 view.updateListener 异步 setState 更安全
    },
    provide: (f) => showTooltip.from(f),
  });
}

// 一个 helper：判断“光标是否在调用括号内”
// 这里做最小判断：前面最近一个 '(' 且它前面是 'figure' 这种标识符（你可以加更严的解析）
function guessCallContext(view: EditorView) {
  const pos = view.state.selection.main.head;
  const before = view.state.doc.sliceString(Math.max(0, pos - 200), pos);

  const i = before.lastIndexOf("(");
  if (i < 0) return null;

  const head = before.slice(0, i);
  const m = head.match(/#?([A-Za-z_][\w-]*)\s*$/);
  if (!m) return null;

  const fnName = m[1];
  // 当前参数 index：括号内按逗号计数（不处理嵌套，够用版；想严谨可做小型 tokenizer）
  const inside = before.slice(i + 1);
  const paramIndex = inside.split(",").length - 1;

  return { fnName, paramIndex };
}

export const setSignatureTooltip = StateEffect.define<Tooltip | null>();

export const signatureTooltipField = StateField.define<Tooltip | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setSignatureTooltip)) {
        return e.value;
      }
    }
    return value;
  },
  provide: (f) => showTooltip.from(f),
});

export function signatureHelpDriver({ viewId }: { viewId: number }) {
  return EditorView.updateListener.of((u) => {
    if (!u.docChanged && !u.selectionSet) return;

    const view = u.view;

    // 防抖（很重要）
    clearTimeout((signatureHelpDriver as any)._t);
    (signatureHelpDriver as any)._t = setTimeout(async () => {
      const ctx = guessCallContext(view);
      if (!ctx) {
        view.dispatch({
          effects: setSignatureTooltip.of(null),
        });
        return;
      }

      const pos = view.state.selection.main.head;
      const lspPos = cmOffsetToLspPos(view.state, pos);
      const triggerChars = new Set(["(", ","]);
      const lastCh = view.state.doc.sliceString(Math.max(0, pos - 1), pos);
      const triggerCharacter = triggerChars.has(lastCh) ? lastCh : undefined;
      const resp = await window.IPC.invoke(`${Channels.TypstLSPSignatureHelp}-${viewId}`, {
        position: lspPos,
        triggerCharacter,
      });
      console.log(resp, "resp");
      const info = formatSignature(resp);
      if (!info) {
        view.dispatch({
          effects: setSignatureTooltip.of(null),
        });
        return;
      }

      const dom = document.createElement("div");
      dom.className = "cm-signature-tooltip !fixed";
      dom.innerHTML = `
        <div class="sig-label">${info.label}</div>
        <div class="sig-param">
          参数 ${info.activeParamIndex + 1}: 
          <b>${info.paramLabel}</b>
        </div>
      `;

      view.dispatch({
        effects: setSignatureTooltip.of({
          pos,
          above: true,
          create: () => ({ dom }),
        }),
      });
    }, 40);
  });
}
