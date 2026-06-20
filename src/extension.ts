import * as vscode from "vscode";
import { registerCommands } from "./commands";
import {
  activateProviders,
  deactivateProviders,
  startExternalClient,
  stopExternalClient,
  restartExternalClient,
  isExternalClientActive,
} from "./lsp";
import { GabcSemanticTokensProvider, LEGEND } from "./semanticTokens";
import { TreeSitterHighlighter } from "./treesitter";
import { initCore } from "./core-wasm";

const GABC_SELECTOR: vscode.DocumentSelector = { language: "gabc" };

// ---------------------------------------------------------------------------
// Mode selection
// ---------------------------------------------------------------------------

type LspMode = "wasm" | "external";
let currentMode: LspMode | undefined;

function resolvedServerPath(): string {
  return vscode.workspace
    .getConfiguration("gregorio")
    .get<string>("languageServer.path", "")
    .trim();
}

async function activateLanguageFeatures(context: vscode.ExtensionContext): Promise<void> {
  const serverPath = resolvedServerPath();
  if (serverPath) {
    currentMode = "external";
    await startExternalClient(context, serverPath);
  } else {
    currentMode = "wasm";
    activateProviders(context);
  }
}

async function deactivateLanguageFeatures(): Promise<void> {
  if (currentMode === "external") {
    await stopExternalClient();
  } else if (currentMode === "wasm") {
    deactivateProviders();
  }
  currentMode = undefined;
}

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialise the gregorio-core WASM module path (loads lazily on first use).
  // Used for editor commands in both modes.
  initCore(context.extensionPath);

  registerCommands(context);

  // Semantic highlighting is always active regardless of mode.
  const highlighter = new TreeSitterHighlighter(context.extensionPath);
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      GABC_SELECTOR,
      new GabcSemanticTokensProvider(highlighter),
      LEGEND,
    ),
  );

  // "Restart language server" command.
  // In external mode: restarts the LSP process.
  // In WASM mode: no-op (in-process, no process to restart).
  context.subscriptions.push(
    vscode.commands.registerCommand("gabc.restartLanguageServer", async () => {
      if (currentMode === "external") {
        await restartExternalClient(context);
      }
      // WASM mode: silently do nothing (providers are always running in-process).
    }),
  );

  // Handle configuration changes:
  // - path change → switch modes (deactivate current, activate new)
  // - enabled change in external mode → restart the client
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      const pathChanged = event.affectsConfiguration("gregorio.languageServer.path");
      const enabledChanged = event.affectsConfiguration("gregorio.languageServer.enabled");

      if (pathChanged) {
        // Mode may have changed: tear down and re-evaluate.
        await deactivateLanguageFeatures();
        await activateLanguageFeatures(context);
        return;
      }

      if (enabledChanged && currentMode === "external") {
        const enabled = vscode.workspace
          .getConfiguration("gregorio")
          .get<boolean>("languageServer.enabled", true);
        if (enabled) {
          await restartExternalClient(context);
        } else {
          await stopExternalClient();
        }
      }
      // Linting/severity config changes in WASM mode are handled inside
      // activateProviders' own onDidChangeConfiguration listener.
    }),
  );

  const enabled = vscode.workspace
    .getConfiguration("gregorio")
    .get<boolean>("languageServer.enabled", true);
  if (enabled) {
    await activateLanguageFeatures(context);
  }
}

export async function deactivate(): Promise<void> {
  await deactivateLanguageFeatures();
}

/** Exposed for tests. */
export function currentLspMode(): LspMode | undefined {
  return currentMode;
}
