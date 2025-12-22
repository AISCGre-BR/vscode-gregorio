import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  DidChangeConfigurationNotification
} from 'vscode-languageclient/node';
import { GabcSemanticTokensProvider, legend } from './semanticTokensProvider';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('[Gregorio] Extension is now active!');
  
  // Check if semantic highlighting is enabled in VS Code
  const editorConfig = vscode.workspace.getConfiguration('editor');
  const semanticEnabled = editorConfig.get<boolean>('semanticHighlighting.enabled');
  console.log('[Gregorio] VS Code semantic highlighting enabled:', semanticEnabled);
  
  if (semanticEnabled === false) {
    vscode.window.showWarningMessage(
      'Semantic highlighting is disabled in VS Code settings. To see improved GABC syntax highlighting, enable "editor.semanticHighlighting.enabled" in your settings.',
      'Enable Now',
      'Later'
    ).then(selection => {
      if (selection === 'Enable Now') {
        editorConfig.update('semanticHighlighting.enabled', true, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Semantic highlighting enabled! Reload the window to apply changes.');
      }
    });
  }

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

  const toggleSemanticHighlightingCommand = vscode.commands.registerCommand('gregorio.toggleSemanticHighlighting', async () => {
    const config = vscode.workspace.getConfiguration('gregorio.highlighting');
    const currentValue = config.get<boolean>('semantic', true);
    await config.update('semantic', !currentValue, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      `Gregorio semantic highlighting ${!currentValue ? 'enabled' : 'disabled'}`
    );
    // Trigger refresh of highlighting
    vscode.window.visibleTextEditors.forEach(editor => {
      if (editor.document.languageId === 'gabc') {
        // Force reparse by making a dummy edit and undoing
        const pos = new vscode.Position(0, 0);
        editor.edit(editBuilder => editBuilder.insert(pos, ' ')).then(() => {
          vscode.commands.executeCommand('undo');
        });
      }
    });
  });

  context.subscriptions.push(restartCommand, toggleLintingCommand, toggleSemanticHighlightingCommand);

  // Register semantic tokens provider for advanced syntax highlighting
  console.log('[Gregorio] Registering semantic tokens provider');
  const semanticTokensProvider = new GabcSemanticTokensProvider();
  
  // Register for both file and untitled schemes
  const semanticTokensRegistrationFile = vscode.languages.registerDocumentSemanticTokensProvider(
    { language: 'gabc', scheme: 'file' },
    semanticTokensProvider,
    legend
  );
  
  const semanticTokensRegistrationUntitled = vscode.languages.registerDocumentSemanticTokensProvider(
    { language: 'gabc', scheme: 'untitled' },
    semanticTokensProvider,
    legend
  );
  
  console.log('[Gregorio] Semantic tokens provider registered');
  context.subscriptions.push(semanticTokensRegistrationFile, semanticTokensRegistrationUntitled);

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
    run: { 
      module: serverPath, 
      transport: TransportKind.ipc,
      options: {
        env: { ...process.env, DISABLE_TREE_SITTER: 'true' }
      }
    },
    debug: {
      module: serverPath,
      transport: TransportKind.ipc,
      options: { 
        execArgv: ['--nolazy', '--inspect=6009'],
        env: { ...process.env, DISABLE_TREE_SITTER: 'true' }
      }
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
