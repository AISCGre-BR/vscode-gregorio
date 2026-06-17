import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;

function config() {
  return vscode.workspace.getConfiguration("gregorio");
}

/**
 * Starts the gregorio-lsp language server (diagnostics, hover, completion,
 * document symbols, and formatting via the embedded grefmt engine).
 *
 * The server binary is a Rust executable distributed via Cargo; it is resolved
 * from `gregorio.languageServer.path` (defaulting to `gregorio-lsp` on PATH).
 * Formatting options are forwarded through workspace configuration.
 */
export async function startLanguageServer(context: vscode.ExtensionContext): Promise<void> {
  if (!config().get<boolean>("languageServer.enabled", true)) {
    return;
  }

  const command = config().get<string>("languageServer.path", "gregorio-lsp");

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
    // gregorio-lsp reads its `formatting` options from this configuration block.
    initializationOptions: {
      formatting: config().get("languageServer.formatting", {}),
    },
  };

  client = new LanguageClient(
    "gregorio-lsp",
    "Gregorio LSP",
    serverOptions,
    clientOptions,
  );

  try {
    await client.start();
    context.subscriptions.push(client);
  } catch (error) {
    client = undefined;
    vscode.window.showWarningMessage(
      `gregorio-lsp could not be started (${String(error)}). ` +
        "Install it with: cargo install --git https://github.com/AISCGre-BR/gregorio-lsp " +
        "--tag v0.9.0 --bin gregorio-lsp, then ensure it is on your PATH. " +
        "Syntax highlighting works without the language server.",
    );
  }
}

export async function stopLanguageServer(): Promise<void> {
  if (client) {
    await client.stop();
    client = undefined;
  }
}

export async function restartLanguageServer(context: vscode.ExtensionContext): Promise<void> {
  await stopLanguageServer();
  await startLanguageServer(context);
}
