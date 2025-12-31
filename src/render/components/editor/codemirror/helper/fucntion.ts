type ScanOptions = {
  /** 是否允许跨行识别（一般 true） */
  allowAcrossLines?: boolean;
  /** 最大向后扫描的字符数，防止极端大文件 O(n) */
  maxScanBack?: number;
};

const DEFAULT_OPTS: Required<ScanOptions> = {
  allowAcrossLines: true,
  maxScanBack: 50_000,
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function isIdentChar(ch: string) {
  // Typst 标识符：这里按常见的 [A-Za-z0-9_-] 简化；你也可以更严格/更宽松
  return /[A-Za-z0-9_-]/.test(ch);
}

function isWhitespace(ch: string) {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function findEnclosingOpenParen(
  text: string,
  start: number,
  end: number,
  allowAcrossLines: boolean,
): number | null {
  let depth = 0;

  let inString = false;
  let stringQuote: '"' | "'" | null = null;
  let inLineComment = false;

  for (let i = end - 1; i >= start; i--) {
    const ch = text[i] ?? "";
    const prev = i > 0 ? (text[i - 1] ?? "") : "";

    if (!allowAcrossLines && ch === "\n") break;

    // 行注释结束：遇到换行
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }

    // 字符串处理（简化：支持 "..." 和 '...'；Typst 里主要是 "..."）
    if (inString) {
      if (ch === stringQuote && prev !== "\\") {
        inString = false;
        stringQuote = null;
      }
      continue;
    } else {
      if ((ch === '"' || ch === "'") && prev !== "\\") {
        inString = true;
        stringQuote = ch;
        continue;
      }
    }

    // 行注释开始：遇到 //
    if (ch === "/" && prev === "/") {
      inLineComment = true;
      i--; // 跳过另一个 '/'
      continue;
    }

    // 正常括号计数
    if (ch === ")") {
      depth++;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) return i;
      depth--;
    }
  }

  return null;
}

function findCalleeBeforeParen(text: string, openParen: number): any | null {
  // 跳过 openParen 左侧空白
  let i = openParen - 1;
  while (i >= 0 && isWhitespace(text[i]!)) i--;

  // 期望这里是标识符末尾
  const end = i + 1;
  while (i >= 0 && isIdentChar(text[i]!)) i--;
  const start = i + 1;

  if (start >= end) return null;
  const callee = text.slice(start, end);

  // 检查是否有 '#' 前缀（允许中间有空白：# foo( 这种你要不要支持可自己定）
  let j = start - 1;
  while (j >= 0 && isWhitespace(text[j]!)) j--;
  const hasHashPrefix = j >= 0 && text[j] === "#";

  return { callee, calleeStart: start, calleeEnd: end, hasHashPrefix };
}

function computeActiveParam(text: string, openParen: number, cursor: number) {
  let activeParamIndex = 0;
  let lastCommaOrOpen = openParen;

  let depth = 0; // 内部嵌套括号深度
  let inString = false;
  let stringQuote: '"' | "'" | null = null;
  let inLineComment = false;

  for (let i = openParen + 1; i < cursor; i++) {
    const ch = text[i]!;
    const prev = i > 0 ? text[i - 1]! : "";

    // 行注释结束
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }

    // 字符串
    if (inString) {
      if (ch === stringQuote && prev !== "\\") {
        inString = false;
        stringQuote = null;
      }
      continue;
    } else {
      if ((ch === '"' || ch === "'") && prev !== "\\") {
        inString = true;
        stringQuote = ch;
        continue;
      }
    }

    // 行注释开始
    if (ch === "/" && prev === "/") {
      inLineComment = true;
      continue;
    }

    // 深度
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      if (depth > 0) depth--;
      continue;
    }

    // 顶层逗号 -> 参数+1
    if (ch === "," && depth === 0) {
      activeParamIndex++;
      lastCommaOrOpen = i;
    }
  }

  // activeParamStart：从 lastCommaOrOpen+1 起跳过空白
  let s = lastCommaOrOpen + 1;
  while (s < cursor && isWhitespace(text[s]!)) s++;

  return { activeParamIndex, activeParamStart: s };
}

function buildCallStack(
  text: string,
  inner: any,
  innerOpenParen: number,
  start: number,
  allowAcrossLines: boolean,
) {
  const stack: Array<
    Pick<any, "callee" | "openParen" | "calleeStart" | "calleeEnd" | "hasHashPrefix">
  > = [];

  // 先把最内层 push
  stack.push({
    callee: inner.callee,
    openParen: innerOpenParen,
    calleeStart: inner.calleeStart,
    calleeEnd: inner.calleeEnd,
    hasHashPrefix: inner.hasHashPrefix,
  });

  // 然后尝试找外层：把扫描 end 定在 inner.calleeStart（或者 innerOpenParen 也可）
  let scanEnd = inner.calleeStart;

  while (true) {
    const outerOpen = findEnclosingOpenParen(text, start, scanEnd, allowAcrossLines);
    if (outerOpen == null) break;

    const outerCallee = findCalleeBeforeParen(text, outerOpen);
    if (!outerCallee) break;

    stack.push({
      callee: outerCallee.callee,
      openParen: outerOpen,
      calleeStart: outerCallee.calleeStart,
      calleeEnd: outerCallee.calleeEnd,
      hasHashPrefix: outerCallee.hasHashPrefix,
    });

    scanEnd = outerCallee.calleeStart;
  }

  // 当前 stack 是 [inner, outer, ...]，我们反转成从外到内更好用
  stack.reverse();
  return stack;
}

/**
 *
 */
export function handleGetFunctionContext(
  text: string,
  cursorOffset: number,
  opts: ScanOptions = {},
) {
  const { allowAcrossLines, maxScanBack } = { ...DEFAULT_OPTS, ...opts };

  const end = clamp(cursorOffset, 0, text.length);
  const start = Math.max(0, end - maxScanBack);

  // 1) 先从 cursor 往左，找“包住 cursor 的最内层未闭合 (”
  //    用一个简化状态机：处理字符串、注释，统计括号深度。
  const openParen = findEnclosingOpenParen(text, start, end, allowAcrossLines);
  if (openParen == null) return null;

  // 2) 根据 openParen 往左找 callee 标识符（支持 #foo( 和 foo( ）
  const calleeInfo = findCalleeBeforeParen(text, openParen);
  if (!calleeInfo) return null;

  // 3) 计算当前参数索引（从 openParen+1 到 cursorOffset 之间，顶层逗号数量）
  const { activeParamIndex, activeParamStart } = computeActiveParam(text, openParen, end);

  // 4) 构建调用栈：从最内层开始，往外层找包裹它的 openParen
  const callStack = buildCallStack(text, calleeInfo, openParen, start, allowAcrossLines);

  return {
    callee: calleeInfo.callee,
    openParen,
    calleeStart: calleeInfo.calleeStart,
    calleeEnd: calleeInfo.calleeEnd,
    activeParamIndex,
    activeParamStart,
    activeParamEnd: end,
    hasHashPrefix: calleeInfo.hasHashPrefix,
    callStack,
  };
}
