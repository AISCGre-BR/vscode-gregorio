"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const node_1 = require("vscode-languageclient/node");
const semanticTokensProvider_1 = require("./semanticTokensProvider");
let client;
function activate(context) {
    console.log('[Gregorio] Extension is now active!');
    // Check if semantic highlighting is enabled in VS Code
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const semanticEnabled = editorConfig.get('semanticHighlighting.enabled');
    console.log('[Gregorio] VS Code semantic highlighting enabled:', semanticEnabled);
    if (semanticEnabled === false) {
        vscode.window.showWarningMessage('Semantic highlighting is disabled in VS Code settings. To see improved GABC syntax highlighting, enable "editor.semanticHighlighting.enabled" in your settings.', 'Enable Now', 'Later').then(selection => {
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
        }
        else {
            vscode.window.showWarningMessage('Gregorio Language Server is not running');
        }
    });
    const toggleLintingCommand = vscode.commands.registerCommand('gregorio.toggleLinting', async () => {
        const config = vscode.workspace.getConfiguration('gregorio.linting');
        const currentValue = config.get('enabled', true);
        await config.update('enabled', !currentValue, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Gregorio linting ${!currentValue ? 'enabled' : 'disabled'}`);
    });
    const toggleSemanticHighlightingCommand = vscode.commands.registerCommand('gregorio.toggleSemanticHighlighting', async () => {
        const config = vscode.workspace.getConfiguration('gregorio.highlighting');
        const currentValue = config.get('semantic', true);
        await config.update('semantic', !currentValue, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Gregorio semantic highlighting ${!currentValue ? 'enabled' : 'disabled'}`);
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
    const semanticTokensProvider = new semanticTokensProvider_1.GabcSemanticTokensProvider();
    // Register for both file and untitled schemes
    const semanticTokensRegistrationFile = vscode.languages.registerDocumentSemanticTokensProvider({ language: 'gabc', scheme: 'file' }, semanticTokensProvider, semanticTokensProvider_1.legend);
    const semanticTokensRegistrationUntitled = vscode.languages.registerDocumentSemanticTokensProvider({ language: 'gabc', scheme: 'untitled' }, semanticTokensProvider, semanticTokensProvider_1.legend);
    console.log('[Gregorio] Semantic tokens provider registered');
    context.subscriptions.push(semanticTokensRegistrationFile, semanticTokensRegistrationUntitled);
    const serverPath = findServerPath(context);
    if (!serverPath) {
        vscode.window.showWarningMessage('Gregorio LSP server not found. Please ensure gregorio-lsp is built and available.', 'Open Settings').then(selection => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'gregorio.lsp.serverPath');
            }
        });
        return;
    }
    const serverOptions = {
        run: { module: serverPath, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverPath,
            transport: node_1.TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=6009'] }
        }
    };
    const clientOptions = {
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
    client = new node_1.LanguageClient('gregorioLanguageServer', 'Gregorio Language Server', serverOptions, clientOptions);
    client.start();
    // Handle configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('gregorio.linting')) {
            client?.sendNotification(node_1.DidChangeConfigurationNotification.type, {
                settings: { linting: getLintingConfig() }
            });
        }
    }));
}
async function deactivate() {
    if (client) {
        await client.stop();
    }
}
function findServerPath(context) {
    const config = vscode.workspace.getConfiguration('gregorio.lsp');
    const configuredPath = config.get('serverPath');
    // If user configured a custom path, use it
    if (configuredPath) {
        if (require('fs').existsSync(configuredPath)) {
            return configuredPath;
        }
        else {
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
        enabled: config.get('enabled', true),
        severity: config.get('severity', 'warning'),
        onSave: config.get('onSave', false),
        ignoreRules: config.get('ignoreRules', [])
    };
}
//# sourceMappingURL=extension.js.map