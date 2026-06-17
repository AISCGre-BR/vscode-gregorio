import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { startLanguageServer, stopLanguageServer, restartLanguageServer } from "./lsp";
import { GabcSemanticTokensProvider, LEGEND } from "./semanticTokens";
import { TreeSitterHighlighter } from "./treesitter";

const GABC_SELECTOR: vscode.DocumentSelector = { language: "gabc" };

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  registerCommands(context);

  const highlighter = new TreeSitterHighlighter(context.extensionPath);
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      GABC_SELECTOR,
      new GabcSemanticTokensProvider(highlighter),
      LEGEND,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gabc.restartLanguageServer", () =>
      restartLanguageServer(context),
    ),
  );

  // Restart the language server when its configuration changes.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("gregorio.languageServer.enabled") ||
        event.affectsConfiguration("gregorio.languageServer.path")
      ) {
        void restartLanguageServer(context);
      }
    }),
  );

  await startLanguageServer(context);
}

export async function deactivate(): Promise<void> {
  await stopLanguageServer();
}
