import type { EditorState } from "@codemirror/state";

/**
 * 获取光标所在的列号
 * @param {import("@codemirror/state").EditorState} state - EditorState
 * @param {number} pos - 光标偏移（当前光标所在位置）
 * @returns {{ line: number; character: number }}
 */
export function handleColumnsPosition(
  state: EditorState,
  pos: number,
): {
  line: number;
  character: number;
} {
  const line = state.doc.lineAt(pos);
  return {
    line: line.number - 1,
    character: pos - line.from,
  };
}

/**
 * 获取上一个非空字符
 * @param {import("@codemirror/state").EditorState} state EditorState
 * @param {number} pos 光标偏移（当前光标所在位置）
 * @param {includeCurrent} 是否包含当前输入字符
 * @returns {{ char: string; charPos: number } | null}
 */
export function handleLastChar(state: EditorState, pos: number, includeCurrent: boolean = false) {
  if (pos === 0) return null;
  const start = includeCurrent ? pos - 1 : pos - 2;
  if (start < 0) return null;
  for (let i = start; i >= 0; i--) {
    const ch = state.doc.sliceString(i, i + 1);
    if (!/\s/.test(ch))
      return {
        char: ch,
        charPos: i,
      };
  }
  return null;
}

/**
 * 获取上一个非空字符串，遇到空格/换行/制表符停止， 与 matchBefore 不同是，matchBefore直接匹配当前光标，handleLastString可以自定义位置
 * @param {import("@codemirror/state").EditorState} state EditorState
 * @param {number} pos 光标偏移（当前光标所在位置）
 * @param {includeCurrent} 是否包含当前输入字符
 * @returns {{ char: string; charPos: number } | null}
 */
export function handleLastString(state: EditorState, pos: number, includeCurrent: boolean = false) {
  const end = includeCurrent ? pos + 1 : pos;
  let start = end;
  while (start > 0) {
    const ch = state.doc.sliceString(start - 1, start);

    if (ch === " " || ch === "\n" || ch === "\t") break;

    start--;
  }
  if (start === end) return null;
  return {
    from: start,
    to: end,
    text: state.doc.sliceString(start, end),
  };
}
