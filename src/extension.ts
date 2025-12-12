import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Gregorio Language Support extension is now active!');

  const serverPath = findServerPath();
  
  if (!serverPath) {
    vscode.window.showWarningMessage(
      'Gregorio LSP server not found. Please ensure gregorio-lsp is built and available.',
      'Open Settings'
    ).then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'gregorio.lsp.serverPath');
      }
    });
    return;
  }

  const serverOptions: ServerOptions = {
    run: { module: serverPath, transport: TransportKind.ipc },
    debug: {
      module: serverPath,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] }
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'gabc' },
      { scheme: 'untitled', language: 'gabc' }
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.gabc')
    }
  };

  client = new LanguageClient(
    'gregorioLanguageServer',
    'Gregorio Language Server',
    serverOptions,
    clientOptions
  );

  client.start();

  const restartCommand = vscode.commands.registerCommand('gregorio.restartServer', async () => {
    if (client) {
      await client.stop();
      await client.start();
      vscode.window.showInformationMessage('Gregorio Language Server restarted');
    }
  });

  context.subscriptions.push(restartCommand);
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
  }
}

function findServerPath(): string | undefined {
  const config = vscode.workspace.getConfiguration('gregorio.lsp');
  const configuredPath = config.get<string>('serverPath');
  
  if (configuredPath) {
    return configuredPath;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    
    const siblingPath = path.join(workspaceRoot, '..', 'gregorio-lsp', 'dist', 'server.js');
    if (require('fs').existsSync(siblingPath)) {
      return siblingPath;
    }

    const localPath = path.join(workspaceRoot, 'gregorio-lsp', 'dist', 'server.js');
    if (require('fs').existsSync(localPath)) {
      return localPath;
    }
  }

  return undefined;
}
