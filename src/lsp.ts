/**
 * Language feature activation for GABC documents.
 *
 * Two mutually exclusive modes:
 *
 * **WASM mode** (default — `gregorio.languageServer.path` is empty)
 *   In-process providers backed by the gregorio-core WASM module.
 *   Provides: diagnostics, document formatting, quickfix code actions.
 *
 * **External mode** (`gregorio.languageServer.path` points to a binary)
 *   Spawns the `gregorio-lsp` process and connects via the Language Server
 *   Protocol.  Provides the full LSP feature set (diagnostics, formatting,
 *   code actions, hover, completion, document symbols, execute commands).
 *   The WASM module is still used for editor commands (note shifting, etc.).
 */

import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { getCore, parseDiagnostics, WasmDiagnostic } from "./core-wasm";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const GABC_SELECTOR: vscode.DocumentSelector = { language: "gabc" };

function getFormatOptions(): string {
  const fmt = vscode.workspace
    .getConfiguration("gregorio")
    .get<Record<string, unknown>>("languageServer.formatting", {});
  return JSON.stringify(fmt);
}

// ---------------------------------------------------------------------------
// WASM mode
// ---------------------------------------------------------------------------

let diagnosticCollection: vscode.DiagnosticCollection | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
// Disposables created in WASM mode, tracked so they can be torn down on switch.
let wasmDisposables: vscode.Disposable[] = [];

function getLintOptions(): string {
  const cfg = vscode.workspace.getConfiguration("gregorio");
  const minSeverity = cfg.get<string>("linting.severity", "info");
  const ignoreCodes = cfg.get<string[]>("linting.ignoreCodes", []);
  return JSON.stringify({ minSeverity, ignoreCodes });
}

function toVscodeDiagnostic(d: WasmDiagnostic): vscode.Diagnostic {
  const severity =
    d.severity === "error"
      ? vscode.DiagnosticSeverity.Error
      : d.severity === "warning"
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

  const range = new vscode.Range(
    new vscode.Position(d.range.start.line, d.range.start.character),
    new vscode.Position(d.range.end.line, d.range.end.character),
  );
  const diag = new vscode.Diagnostic(range, d.message, severity);
  diag.source = "gregorio";
  if (d.code) diag.code = d.code;
  if (d.fix) {
    (diag as vscode.Diagnostic & { data?: unknown }).data = { fix: d.fix };
  }
  return diag;
}

async function updateDiagnostics(document: vscode.TextDocument): Promise<void> {
  if (document.languageId !== "gabc" || !diagnosticCollection) return;
  const cfg = vscode.workspace.getConfiguration("gregorio");
  if (!cfg.get<boolean>("languageServer.enabled", true)) {
    diagnosticCollection.delete(document.uri);
    return;
  }
  try {
    const core = await getCore();
    const json = core.diagnostics(document.getText(), getLintOptions());
    diagnosticCollection.set(document.uri, parseDiagnostics(json).map(toVscodeDiagnostic));
  } catch (err) {
    console.warn("[gregorio] WASM diagnostics unavailable:", err);
  }
}

export function activateProviders(context: vscode.ExtensionContext): void {
  diagnosticCollection = vscode.languages.createDiagnosticCollection("gregorio");

  const d: vscode.Disposable[] = [
    diagnosticCollection,
    vscode.workspace.onDidOpenTextDocument((doc) => void updateDiagnostics(doc)),
    vscode.workspace.onDidChangeTextDocument((ev) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void updateDiagnostics(ev.document), 300);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => diagnosticCollection?.delete(doc.uri)),
    vscode.languages.registerDocumentFormattingEditProvider(GABC_SELECTOR, {
      async provideDocumentFormattingEdits(doc: vscode.TextDocument): Promise<vscode.TextEdit[]> {
        const core = await getCore();
        const text = doc.getText();
        const formatted = core.format(text, getFormatOptions());
        if (formatted === text) return [];
        return [
          vscode.TextEdit.replace(
            new vscode.Range(new vscode.Position(0, 0), doc.positionAt(text.length)),
            formatted,
          ),
        ];
      },
    }),
    vscode.languages.registerCodeActionsProvider(
      GABC_SELECTOR,
      {
        provideCodeActions(
          document: vscode.TextDocument,
          _range: vscode.Range,
          ctx: vscode.CodeActionContext,
        ): vscode.CodeAction[] {
          return ctx.diagnostics.flatMap((diag) => {
            const fix = (diag as { data?: { fix?: Record<string, unknown> } }).data?.fix;
            if (!fix) return [];
            const action = new vscode.CodeAction(
              "Split into individual note groups",
              vscode.CodeActionKind.QuickFix,
            );
            action.diagnostics = [diag];
            action.isPreferred = true;
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(
              document.uri,
              new vscode.Range(
                new vscode.Position(fix.start_line as number, fix.start_character as number),
                new vscode.Position(fix.end_line as number, fix.end_character as number),
              ),
              fix.new_text as string,
            );
            return [action];
          });
        },
      },
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
    ),
    vscode.workspace.onDidChangeConfiguration((ev) => {
      if (
        ev.affectsConfiguration("gregorio.languageServer.enabled") ||
        ev.affectsConfiguration("gregorio.linting")
      ) {
        for (const doc of vscode.workspace.textDocuments) void updateDiagnostics(doc);
      }
    }),
  ];

  // Register with context.subscriptions so they survive a mode switch and are
  // cleaned up on extension deactivation regardless.
  for (const item of d) context.subscriptions.push(item);
  wasmDisposables = d;

  // Seed diagnostics for already-open documents.
  for (const doc of vscode.workspace.textDocuments) void updateDiagnostics(doc);
}

export function deactivateProviders(): void {
  clearTimeout(debounceTimer);
  debounceTimer = undefined;
  for (const d of wasmDisposables) d.dispose();
  wasmDisposables = [];
  diagnosticCollection = undefined;
}

// ---------------------------------------------------------------------------
// External mode
// ---------------------------------------------------------------------------

let externalClient: LanguageClient | undefined;

/**
 * Starts the external `gregorio-lsp` binary as a Language Server.
 * `command` is the path or name of the binary (resolved from PATH if bare name).
 */
export async function startExternalClient(
  context: vscode.ExtensionContext,
  command: string,
): Promise<void> {
  const serverOptions: ServerOptions = {
    run: { command, args: ["--stdio"], transport: TransportKind.stdio },
    debug: { command, args: ["--stdio"], transport: TransportKind.stdio },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "gabc" }],
    synchronize: {
      configurationSection: "gregorio",
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.gabc"),
    },
    initializationOptions: {
      formatting: vscode.workspace
        .getConfiguration("gregorio")
        .get("languageServer.formatting", {}),
    },
  };

  externalClient = new LanguageClient(
    "gregorio-lsp",
    "Gregorio LSP",
    serverOptions,
    clientOptions,
  );

  try {
    await externalClient.start();
    context.subscriptions.push(externalClient);
  } catch (err) {
    externalClient = undefined;
    vscode.window.showWarningMessage(
      `gregorio-lsp could not be started (${String(err)}). ` +
        "Install with: cargo install --git https://github.com/AISCGre-BR/gregorio-lsp " +
        "--tag v0.11.0 --bin gregorio-lsp, then ensure it is on your PATH. " +
        "To use the built-in WASM engine instead, clear the " +
        "'gregorio.languageServer.path' setting.",
    );
  }
}

export async function stopExternalClient(): Promise<void> {
  if (externalClient) {
    await externalClient.stop();
    externalClient = undefined;
  }
}

export async function restartExternalClient(context: vscode.ExtensionContext): Promise<void> {
  const command = vscode.workspace
    .getConfiguration("gregorio")
    .get<string>("languageServer.path", "")
    .trim();
  await stopExternalClient();
  if (command) await startExternalClient(context, command);
}

export function isExternalClientActive(): boolean {
  return externalClient !== undefined;
}
