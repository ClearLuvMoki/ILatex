import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ipcMain, type WebContentsView } from "electron";
import { Channels } from "@/domains/constant/channels";
import logger from "@/main/logger";
import { UIConstant } from "@/src/domains/constant/ui";
import RouterPath from "@/src/render/router/paths";
import { mainWindow } from "../..";
import { TinymistClient } from "../../lsp/tinymist";
import { MainTools } from "../../utils/tools";
import { PreviewViewManager, TabViewManager } from "..";
import { BaseView } from "../base-view";

export abstract class TypstCodeViewManager {
  static view: WebContentsView | null = null;

  static onSetViewBounds(view: WebContentsView) {
    if (!view) return;
    mainWindow?.contentView.addChildView(view);
  }

  static async onCreate(dir: string, file: string) {
    const size = mainWindow?.getBounds();
    const _x = UIConstant.SideWidth + 20;
    TypstCodeViewManager.view = BaseView({
      bounds: {
        x: _x,
        y: UIConstant.TabHeight + 20,
        width: (size?.width as any) - _x - UIConstant.AppPadding,
        height: (size?.height as any) - UIConstant.TabHeight - 10 - UIConstant.AppPadding * 2,
      },
      loadURL: MainTools.getRenderURL(RouterPath.CodeEditor),
    });
    const viewId = TypstCodeViewManager.view.webContents.id;
    MainTools.isDev &&
      TypstCodeViewManager.view.webContents.openDevTools({
        mode: "bottom",
      });

    mainWindow?.contentView.addChildView(TypstCodeViewManager.view);

    const dirurl = resolve(dir);
    const fileurl = resolve(file);
    const backupPath = `${fileurl}.cache`;
    const content = readFileSync(existsSync(backupPath) ? backupPath : fileurl, "utf-8");
    ipcMain.handle(`${Channels.ReadFile}-${viewId}`, () =>
      readFileSync(existsSync(backupPath) ? backupPath : fileurl, "utf-8"),
    );

    let client: TinymistClient | undefined;
    let currentText: string = content;
    try {
      client = await TinymistClient.create({
        cwd: dirurl,
        onDiagnostics: (params: any) => {
          TypstCodeViewManager.view?.webContents.send(Channels.TypstDiagnosticsPush, params);
        },
      });
    } catch (e) {
      console.log(`tinymist start failed: ${String((e as any)?.message ?? e)}`);
    }

    ipcMain.handle(`${Channels.TypstLSPInitRequest}-${viewId}`, async () => {
      if (!client) throw new Error("LSP not available");
      return client.getInitResult();
    });
    ipcMain.handle(`${Channels.TypstLSPSemanticTokensFull}-${viewId}`, async () => {
      if (!client) throw new Error("LSP not available");
      return client.semanticTokensFull(pathToFileURL(fileurl).toString());
    });

    ipcMain.handle(`${Channels.TypstLSPDidOpen}-${viewId}`, () => {
      if (!client) throw new Error("LSP not available");
      client.openDocument(pathToFileURL(fileurl).toString(), "typst", content);
      return client.getInitResult();
    });
    ipcMain.handle(`${Channels.TypstLSPDidChange}-${viewId}`, (_e, { text }) => {
      if (!client) throw new Error("LSP not available");
      client.openDocument(pathToFileURL(fileurl).toString(), "typst", text);
      currentText = text ?? currentText;
      client.changeDocument(pathToFileURL(fileurl).toString(), text);
      return true;
    });
    ipcMain.handle(
      `${Channels.TypstLSPCompletion}-${viewId}`,
      (_e, { position, triggerCharacter }) => {
        if (!client) throw new Error("LSP not available");
        logger.info(JSON.stringify(position), triggerCharacter, "triggerCharacter");
        return client.completion(pathToFileURL(fileurl).toString(), position, triggerCharacter);
      },
    );
    ipcMain.handle(`${Channels.TypstLSPHover}-${viewId}`, (_e, { position }) => {
      if (!client) throw new Error("LSP not available");
      return client.hover(pathToFileURL(fileurl).toString(), position);
    });

    ipcMain.handle(
      `${Channels.TypstLSPSignatureHelp}-${viewId}`,
      (_, { position, triggerCharacter }) => {
        if (!client) throw new Error("LSP not available");
        return client.signatureHelp(pathToFileURL(fileurl).toString(), position, triggerCharacter);
      },
    );

    ipcMain.handle(
      `${Channels.TypstSaveFile}-${viewId}`,
      async (_e, { path, text }: { path?: string; text?: string }) => {
        try {
          TabViewManager.editView = TabViewManager.editView.filter((id) => id !== viewId);
          TabViewManager.notify();
          const targetPath = path || fileurl;
          const targetText = text || currentText;
          writeFileSync(targetPath, targetText, "utf-8");
          writeFileSync(backupPath, text ?? "", "utf-8");
          if (existsSync(backupPath)) {
            unlinkSync(backupPath);
          }
          return true;
        } catch (err) {
          throw new Error(`save failed: ${(err as any)?.message ?? err}`);
        }
      },
    );

    ipcMain.handle(`${Channels.TypstGetInfo}-${viewId}`, () => {
      const { dir, name } = parse(fileurl);
      const cachePath = join(dir, `${name}.cache`);
      const exists = existsSync(cachePath);
      if (exists) {
        TabViewManager.editView.push(viewId);
        TabViewManager.notify();
      }
      return { path: fileurl };
    });

    ipcMain.handle(`${Channels.WriteFile}-${viewId}`, (_e, { text }: { text: string }) => {
      try {
        TabViewManager.editView.push(viewId);
        TabViewManager.notify();
        writeFileSync(backupPath, text ?? "", "utf-8");
        return true;
      } catch (err) {
        throw new Error(`backup write failed: ${(err as any)?.message ?? err}`);
      }
    });
    ipcMain.handle(
      `${Channels.TypstCompile}-${viewId}`,
      async (_e, { format = "pdf" }: { format?: "pdf" | "svg" }) => {
        const fmt = format === "svg" ? "svg" : "pdf";
        let logs = "";
        try {
          writeFileSync(fileurl, currentText, "utf-8");
        } catch (err) {
          PreviewViewManager.sendMessage(
            Channels.TypstCompileError,
            `write file failed: ${(err as any)?.message ?? err}`,
          );
          PreviewViewManager.onShow("");
          return {
            success: false,
            error: `write file failed: ${(err as any)?.message ?? err}`,
            log: logs,
          };
        }

        const { name, base } = parse(fileurl);
        const outPath =
          fmt === "svg" ? resolve(dirurl, `.${name}.svg`) : resolve(dirurl, `.${name}.pdf`);
        const inputRel = base;

        if (client) {
          try {
            await client.request("workspace/executeCommand", {
              command: "tinymist.export",
              arguments: [
                {
                  uri: pathToFileURL(fileurl).toString(),
                  format: fmt,
                  output: outPath,
                },
              ],
            } as any);
            return { success: true, path: outPath, format: fmt };
          } catch (e) {
            logs += `rpc compile failed: ${String((e as any)?.message ?? e)}\n`;
          }
        }

        const devTinymistBin = resolve(
          __dirname,
          "../../../public/lib/tinymist/tinymist-darwin-arm64",
        );
        const trySpawn = (cmd: string, args: string[]) =>
          new Promise<void>((resolve, reject) => {
            const p = spawn(cmd, args, { cwd: dirurl });
            let stderr = "";
            p.stdout?.on("data", () => {});
            // biome-ignore lint/suspicious/noAssignInExpressions: <data ouput>
            p.stderr?.on("data", (d) => (stderr += d.toString()));
            p.on("error", (err) => reject(err));
            p.on("exit", (code) =>
              code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}\n${stderr}`)),
            );
          });

        const attempts: Array<{ cmd: string; args: string[] }> = [];
        const envTinymist = process.env.TINYMIST_BIN;
        const envTypst = process.env.TYPST_BIN;
        try {
          const { access, chmod } = await import("node:fs/promises");
          await access(devTinymistBin);
          try {
            await chmod(devTinymistBin, 0o755);
          } catch {}
          if (process.platform === "darwin") {
            try {
              await trySpawn("xattr", ["-dr", "com.apple.quarantine", devTinymistBin]);
            } catch (e) {
              logs += `xattr failed: ${String((e as any)?.message ?? e)}\n`;
            }
          }
          attempts.push({
            cmd: devTinymistBin,
            args: ["compile", "-f", fmt, "--root", dirurl, inputRel, outPath],
          });
        } catch (e) {
          logs += `dev tinymist access failed: ${String((e as any)?.message ?? e)}\n`;
        }
        if (envTinymist) {
          try {
            const { access } = await import("node:fs/promises");
            await access(envTinymist);
            attempts.unshift({
              cmd: envTinymist,
              args: ["compile", "-f", fmt, "--root", dirurl, inputRel, outPath],
            });
          } catch (e) {
            logs += `env tinymist access failed: ${String((e as any)?.message ?? e)}\n`;
          }
        }
        if (envTypst) {
          attempts.push({
            cmd: envTypst,
            args: ["compile", "-f", fmt, "--root", dirurl, inputRel, outPath],
          });
        }

        for (const a of attempts) {
          try {
            await trySpawn(a.cmd, a.args);
            PreviewViewManager.onShow(outPath);
            return { success: true, path: outPath, format: fmt };
          } catch (err) {
            logs += `${String((err as any)?.message ?? err)}\n`;
          }
        }
        PreviewViewManager.onShow("");
        setTimeout(() => {
          console.log(logs.trimEnd(), "logs.trimEnd()");
          PreviewViewManager.sendMessage(Channels.TypstCompileError, `${logs.trimEnd()}`);
        }, 300);
        return {
          success: false,
          error: "compile failed: Tinymist CLI not found or failed.",
          log: logs.trimEnd(),
        };
      },
    );

    TypstCodeViewManager.view.webContents.loadURL(MainTools.getRenderURL(RouterPath.CodeEditor));
    return TypstCodeViewManager.view;
  }
}
