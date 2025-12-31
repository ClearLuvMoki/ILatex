import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { access, chmod } from "node:fs/promises";
import { join } from "node:path";
import {
  createMessageConnection,
  type MessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from "vscode-jsonrpc/node";
import { MainTools } from "../utils/tools";

type TinymistClientOptions = {
  cwd?: string;
  args?: string[];
  autoRestart?: boolean;
  startupTimeoutMs?: number;
  restartDelayMs?: number;
  log?: (msg: string) => void;
  error?: (msg: string) => void;
  onDiagnostics?: (params: any) => void;
};

async function ensureExecutable(filePath: string) {
  try {
    chmod(filePath, 0o755);
  } catch {
    // 忽略：Windows 或者已可执行
  }
}

async function runOnce(cmd: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "ignore" });
    p.on("error", reject);
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function ensureRunnable(filePath: string) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Tinymist binary not accessible: ${filePath}`);
  }
  if (process.platform === "darwin") {
    try {
      await runOnce("xattr", ["-dr", "com.apple.quarantine", filePath]);
    } catch {}
  }
}

export class TinymistClient {
  private child?: ChildProcessWithoutNullStreams;
  private readonly opts: TinymistClientOptions;
  private disposed = false;
  private starting?: Promise<void>;
  private connection?: MessageConnection;
  private restartTimer?: NodeJS.Timeout;
  private wantsRestart = false;
  private openedDocs = new Map<string, number>();
  private initResult?: any;

  private constructor(opts: TinymistClientOptions) {
    this.opts = {
      args: [],
      autoRestart: true,
      startupTimeoutMs: 12_000,
      restartDelayMs: 800,
      ...opts,
    };
  }

  static async create(opts: TinymistClientOptions = {}) {
    const client = new TinymistClient(opts);
    await client.start();
    return client;
  }

  async start() {
    if (this.disposed) throw new Error("TinymistClient is disposed");
    if (this.starting) return this.starting;

    this.starting = this.doStart().finally(() => {
      this.starting = undefined;
    });

    return this.starting;
  }

  async doStart() {
    const bin = MainTools.isDev
      ? join(__dirname, "../../../public/lib/tinymist/tinymist-darwin-arm64")
      : join(
          process.resourcesPath,
          "tiny-tex",
          process.arch === "arm64" ? "arm64" : "x64",
          "./mac/bin/universal-darwin/pdflatex",
        );

    if (!existsSync(bin)) {
      throw new Error(`Tinymist binary not found: ${bin}`);
    }
    await ensureExecutable(bin);
    await ensureRunnable(bin);
    console.log(`spawn: ${bin}`);
    this.child = spawn(bin, this.opts.args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: this.opts.cwd,
      env: { ...process.env },
    });
    await new Promise<void>((resolve, reject) => {
      const onErr = (e: any) => reject(e);
      this.child?.once("error", onErr);
      this.child?.once("spawn", () => {
        this.child?.off("error", onErr);
        resolve();
      });
    });

    this.child.stderr.on("data", (d) => {
      console.log(d.toString().trimEnd());
    });
    const reader = new StreamMessageReader(this.child.stdout);
    const writer = new StreamMessageWriter(this.child.stdin);

    this.connection = createMessageConnection(reader, writer);

    this.connection.onError((e) => {
      console.log(`rpc error: ${String((e as any)?.message ?? e)}`);
    });

    this.connection.onClose(() => {
      console.log("rpc closed");
    });

    this.connection.listen();
    await this.withTimeout(
      this.initialize(),
      this.opts.startupTimeoutMs!,
      "tinymist initialize timeout",
    );

    // 监听退出，决定是否重启
    this.child.once("exit", (code, signal) => {
      console.log(`process exit: code=${code} signal=${signal ?? ""}`);
      this.cleanupAfterExit();

      if (!this.disposed && this.opts.autoRestart && this.wantsRestart) {
        this.scheduleRestart();
      }
    });

    this.wantsRestart = true;
  }

  private cleanupAfterExit() {
    try {
      this.connection?.dispose();
    } catch {}
    this.connection = undefined;
    this.child = undefined;
  }

  private scheduleRestart() {
    clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (this.disposed || !this.opts.autoRestart || !this.wantsRestart) return;
      console.log("restarting...");
      this.start().catch((e) => console.log(`restart failed: ${String((e as any)?.message ?? e)}`));
    }, this.opts.restartDelayMs);
  }

  private async initialize() {
    const params: any = {
      processId: process.pid,
      rootUri: null,
      capabilities: {
        general: {
          positionEncodings: ["utf-16"],
        },
        textDocument: {
          signatureHelp: {
            signatureInformation: {
              parameterInformation: {
                labelOffsetSupport: true,
              },
              documentationFormat: ["markdown", "plaintext"],
            },
            contextSupport: true,
          },
          synchronization: { dynamicRegistration: false, willSaveWaitUntil: false },
          completion: {
            dynamicRegistration: false,
            completionItem: { snippetSupport: true, commitCharactersSupport: true },
          },
          hover: { dynamicRegistration: false },
          semanticTokens: {
            dynamicRegistration: false,
            requests: { full: true, range: false },
            tokenTypes: [],
            tokenModifiers: [],
            formats: ["relative"],
          },
        },
        workspace: { didChangeConfiguration: { dynamicRegistration: false } },
      },
      clientInfo: { name: "ilatex", version: "0.0.0" },
    };

    const res = await this.connection?.sendRequest("initialize", params);
    this.connection?.sendNotification("initialized", {});
    console.log("initialized OK");
    this.bindNotifications();
    this.initResult = res;
    return res;
  }

  async notify<P>(method: string, params: P) {
    await this.start();
    this.connection?.sendNotification(method, params as any);
  }

  getInitResult() {
    return this.initResult;
  }

  async request<P, R>(method: string, params: P, timeoutMs = 10_000): Promise<R> {
    await this.start();
    return this.withTimeout(
      this.connection?.sendRequest(method, params as any),
      timeoutMs,
      `request timeout: ${method}`,
    );
  }

  openDocument(uri: string, languageId: string, text: string) {
    const version = 1;
    this.openedDocs.set(uri, version);
    this.connection?.sendNotification("textDocument/didOpen", {
      textDocument: { uri, languageId, version, text },
    });
  }

  changeDocument(uri: string, text: string) {
    const prev = this.openedDocs.get(uri) ?? 0;
    const version = prev + 1;
    this.openedDocs.set(uri, version);
    this.connection!.sendNotification("textDocument/didChange", {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
  }

  closeDocument(uri: string) {
    this.openedDocs.delete(uri);
    this.connection!.sendNotification("textDocument/didClose", { textDocument: { uri } });
  }

  completion(
    uri: string,
    position: { line: number; character: number },
    triggerCharacter?: string,
  ) {
    return this.connection!.sendRequest("textDocument/completion", {
      textDocument: { uri },
      position,
      context: triggerCharacter ? { triggerKind: 2, triggerCharacter } : { triggerKind: 1 },
    });
  }

  semanticTokensFull(uri: string) {
    return this.connection!.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri },
    });
  }

  async signatureHelp(
    uri: string,
    position: { line: number; character: number },
    triggerCharacter?: string,
  ) {
    return await this.connection?.sendRequest("textDocument/signatureHelp", {
      textDocument: { uri },
      position,
      context: triggerCharacter
        ? { triggerKind: 2, triggerCharacter, isRetrigger: false } // TriggerCharacter
        : { triggerKind: 1, isRetrigger: true }, // Invoked
    });
  }

  hover(uri: string, position: { line: number; character: number }) {
    return this.connection!.sendRequest("textDocument/hover", {
      textDocument: { uri },
      position,
    });
  }

  private bindNotifications() {
    this.connection!.onNotification("textDocument/publishDiagnostics", (params: any) => {
      this.opts.log?.(`diagnostics:${params?.uri ?? ""}`);
      this.opts.onDiagnostics?.(params);
    });
    this.connection!.onNotification("window/logMessage", (params: any) => {
      this.opts.log?.(`[lsp] ${params?.message ?? ""}`);
    });
  }

  private async withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
    let t: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, rej) => {
      t = setTimeout(() => rej(new Error(msg)), ms);
    });

    try {
      return await Promise.race([p, timeout]);
    } finally {
      if (t) clearTimeout(t);
    }
  }
}
