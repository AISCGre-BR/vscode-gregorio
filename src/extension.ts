import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  DidChangeConfigurationNotification
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Gregorio Language Support extension is now active!');

  // Register commands first, so they're available even if server isn't found
  const restartCommand = vscode.commands.registerCommand('gregorio.restartServer', async () => {
    if (client) {
      await client.stop();
      await client.start();
      vscode.window.showInformationMessage('Gregorio Language Server restarted');
    } else {
      vscode.window.showWarningMessage('Gregorio Language Server is not running');
    }
  });

  const toggleLintingCommand = vscode.commands.registerCommand('gregorio.toggleLinting', async () => {
    const config = vscode.workspace.getConfiguration('gregorio.linting');
    const currentValue = config.get<boolean>('enabled', true);
    await config.update('enabled', !currentValue, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      `Gregorio linting ${!currentValue ? 'enabled' : 'disabled'}`
    );
  });

  context.subscriptions.push(restartCommand, toggleLintingCommand);

  const serverPath = findServerPath(context);
  
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
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.gabc'),
      configurationSection: ['gregorio']
    },
    initializationOptions: {
      linting: getLintingConfig()
    }
  };

  client = new LanguageClient(
    'gregorioLanguageServer',
    'Gregorio Language Server',
    serverOptions,
    clientOptions
  );

  client.start();

  // Handle configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('gregorio.linting')) {
        client?.sendNotification(DidChangeConfigurationNotification.type, {
          settings: { linting: getLintingConfig() }
        });
      }
    })
  );
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
  }
}

function findServerPath(context: vscode.ExtensionContext): string | undefined {
  const config = vscode.workspace.getConfiguration('gregorio.lsp');
  const configuredPath = config.get<string>('serverPath');
  
  // If user configured a custom path, use it
  if (configuredPath) {
    if (require('fs').existsSync(configuredPath)) {
      return configuredPath;
    } else {
      console.warn(`Configured LSP server path does not exist: ${configuredPath}`);
    }
  }

  // Try bundled server first (shipped with extension)
  const bundledPath = context.asAbsolutePath(path.join('dist', 'server.js'));
  if (require('fs').existsSync(bundledPath)) {
    return bundledPath;
  }

  // Fallback: search for external installations (for development)
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

function getLintingConfig() {
  const config = vscode.workspace.getConfiguration('gregorio.linting');
  return {
    enabled: config.get<boolean>('enabled', true),
    severity: config.get<string>('severity', 'warning'),
    onSave: config.get<boolean>('onSave', false),
    ignoreRules: config.get<string[]>('ignoreRules', [])
  };
}
