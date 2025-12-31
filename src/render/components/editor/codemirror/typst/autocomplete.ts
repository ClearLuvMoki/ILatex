import type { Completion, CompletionContext, CompletionSource } from "@codemirror/autocomplete";
import { Channels } from "@/src/domains/constant/channels";
import { handleColumnsPosition, handleLastChar } from "../helper/pos";
import type { SignatureType } from "./types";

export const onTransformSignature = (signature: SignatureType, keyword?: string) => {
  switch (keyword) {
    case "figure": {
      switch (signature?.paramLabel) {
        case "body:":
          return "image";
        default:
          return signature.paramLabel;
      }
    }
    default:
      return signature.paramLabel;
  }
};

export const onFormatFullCompletion = (res: any) => {
  return (
    res?.items?.map((item: any) => {
      return {
        label: item?.label,
        detail: item?.detail,
      };
    }) ?? []
  );
};

const onFormatSignature = (res: any) => {
  return (
    res?.signatures?.[0]?.parameters?.map((item: any) => {
      return {
        label: item?.label,
        detail: item?.documentation?.value,
      };
    }) ?? []
  );
};

export const typst_lsp_auto_completion = ({ viewId }: { viewId: number }): CompletionSource => {
  return async (ctx: CompletionContext) => {
    const pos = ctx.pos;
    const word = ctx.matchBefore(/\w*/);
    let options: Completion[] = [];
    const lspPos = handleColumnsPosition(ctx.state, pos);
    const lspChar = handleLastChar(ctx.state, pos)?.char ?? "";
    const signatureRes = await window.IPC.invoke(`${Channels.TypstLSPSignatureHelp}-${viewId}`, {
      position: lspPos,
      triggerCharacter: lspChar,
    });
    // 拼接当前context的代码补全，以及根据已经输入的word过滤选项
    const fullCompletionRes = await window.IPC.invoke(`${Channels.TypstLSPCompletion}-${viewId}`, {
      position: lspPos,
      triggerCharacter: lspChar,
    });
    options = options
      .concat(onFormatSignature(signatureRes))
      .concat(onFormatFullCompletion(fullCompletionRes))
      .filter((item) => item.label.includes(word?.text ?? ""));
    return {
      from: word?.from ?? ctx.pos,
      to: word?.to,
      options,
    };
  };
};
