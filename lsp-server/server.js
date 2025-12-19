"use strict";
/**
 * Gregorio LSP Server
 * Main Language Server Protocol implementation for GABC files
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const gabc_parser_1 = require("./parser/gabc-parser");
const tree_sitter_integration_1 = require("./parser/tree-sitter-integration");
const validator_1 = require("./validation/validator");
const semantic_analyzer_1 = require("./validation/semantic-analyzer");
// Create LSP connection
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
// Create text document manager
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
// Create validator
const validator = new validator_1.DocumentValidator();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let lintingConfig = {
    enabled: true,
    severity: 'warning',
    onSave: false,
    ignoreRules: []
};
connection.onInitialize((params) => {
    const capabilities = params.capabilities;
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['(', '|', '<', 'n', 'a', 'b', 'c']
            },
            hoverProvider: true,
            definitionProvider: false,
            documentSymbolProvider: true,
            workspaceSymbolProvider: false
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});
connection.onInitialized(() => {
    const useTreeSitter = tree_sitter_integration_1.treeSitterParser.isTreeSitterAvailable();
    connection.console.log(`Gregorio LSP Server initialized. Using ${useTreeSitter ? 'tree-sitter' : 'fallback'} parser.`);
    if (hasConfigurationCapability) {
        connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
    }
});
// Configuration change handler
connection.onDidChangeConfiguration(change => {
    if (change.settings && change.settings.linting) {
        lintingConfig = { ...lintingConfig, ...change.settings.linting };
        connection.console.log(`Linting config updated: ${JSON.stringify(lintingConfig)}`);
        // Re-validate all open documents
        documents.all().forEach(validateTextDocument);
    }
});
// Document change handlers
documents.onDidOpen(e => {
    if (lintingConfig.enabled && !lintingConfig.onSave) {
        validateTextDocument(e.document);
    }
});
documents.onDidChangeContent(change => {
    if (lintingConfig.enabled && !lintingConfig.onSave) {
        validateTextDocument(change.document);
    }
});
documents.onDidSave(e => {
    if (lintingConfig.enabled && lintingConfig.onSave) {
        validateTextDocument(e.document);
    }
});
documents.onDidClose(e => {
    connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});
async function validateTextDocument(textDocument) {
    // If linting is disabled, clear diagnostics and return
    if (!lintingConfig.enabled) {
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
        return;
    }
    const text = textDocument.getText();
    let parsedDoc;
    // Try tree-sitter first, fall back to TypeScript parser
    if (tree_sitter_integration_1.treeSitterParser.isTreeSitterAvailable()) {
        try {
            const tree = tree_sitter_integration_1.treeSitterParser.parse(text);
            if (tree) {
                const headers = tree_sitter_integration_1.treeSitterParser.extractHeaders(tree, text);
                const errors = tree_sitter_integration_1.treeSitterParser.extractErrors(tree);
                parsedDoc = {
                    headers,
                    notation: { syllables: [], range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } },
                    comments: [],
                    errors
                };
            }
        }
        catch (error) {
            connection.console.warn(`Tree-sitter parsing failed, using fallback: ${error}`);
        }
    }
    // Fallback to TypeScript parser
    if (!parsedDoc) {
        const parser = new gabc_parser_1.GabcParser(text);
        parsedDoc = parser.parse();
    }
    // Validate the document with validation rules
    const errors = validator.validate(parsedDoc);
    // Run semantic analysis
    const semanticErrors = (0, semantic_analyzer_1.analyzeSemantics)(parsedDoc);
    // Combine all errors
    const allErrors = [...errors, ...semanticErrors];
    // Filter diagnostics based on configuration
    const filteredErrors = filterDiagnostics(allErrors);
    // Convert to LSP diagnostics
    const diagnostics = filteredErrors.map(error => convertToDiagnostic(error));
    // Send diagnostics to client
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}
function filterDiagnostics(errors) {
    return errors.filter(error => {
        // Filter by ignored rules
        if (error.code && lintingConfig.ignoreRules.includes(error.code)) {
            return false;
        }
        // Filter by severity level
        const severityOrder = { error: 0, warning: 1, info: 2 };
        const errorLevel = severityOrder[error.severity] ?? 2;
        const configLevel = severityOrder[lintingConfig.severity] ?? 1;
        return errorLevel <= configLevel;
    });
}
function convertToDiagnostic(error) {
    const severity = error.severity === 'error' ? node_1.DiagnosticSeverity.Error :
        error.severity === 'warning' ? node_1.DiagnosticSeverity.Warning :
            node_1.DiagnosticSeverity.Information;
    return {
        severity,
        range: {
            start: { line: error.range.start.line, character: error.range.start.character },
            end: { line: error.range.end.line, character: error.range.end.character }
        },
        message: error.message,
        source: 'gregorio-lsp',
        code: error.code
    };
}
// Hover provider
connection.onHover(params => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }
    const text = document.getText();
    const position = params.position;
    // Try to get node at position with tree-sitter
    if (tree_sitter_integration_1.treeSitterParser.isTreeSitterAvailable()) {
        const tree = tree_sitter_integration_1.treeSitterParser.parse(text);
        if (tree) {
            const node = tree_sitter_integration_1.treeSitterParser.findNodeAt(tree, position);
            if (node) {
                const nodeText = tree_sitter_integration_1.treeSitterParser.getNodeText(node, text);
                return {
                    contents: {
                        kind: 'markdown',
                        value: `**${node.type}**\n\n\`\`\`gabc\n${nodeText}\n\`\`\``
                    }
                };
            }
        }
    }
    return null;
});
// Completion provider
connection.onCompletion(_params => {
    // Basic completion items for GABC notation
    return [
        {
            label: 'c4',
            kind: 1, // Text
            detail: 'C clef on line 4',
            documentation: 'Places a C clef on the 4th line of the staff'
        },
        {
            label: 'f3',
            kind: 1,
            detail: 'F clef on line 3',
            documentation: 'Places an F clef on the 3rd line of the staff'
        },
        {
            label: '::',
            kind: 1,
            detail: 'Divisio finalis',
            documentation: 'Final bar (double bar)'
        },
        {
            label: 'nabc-lines:',
            kind: 14, // Keyword
            detail: 'NABC lines header',
            documentation: 'Declares the number of NABC lines (currently only 1 is supported)'
        }
    ];
});
// Document symbols provider
connection.onDocumentSymbol(params => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    const text = document.getText();
    const parser = new gabc_parser_1.GabcParser(text);
    const parsed = parser.parse();
    const symbols = [];
    // Add header symbols
    parsed.headers.forEach((value, name) => {
        const range = {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
        };
        symbols.push(node_1.DocumentSymbol.create(`${name}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`, undefined, node_1.SymbolKind.String, range, range));
    });
    return symbols;
});
// Make the text document manager listen on the connection
documents.listen(connection);
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map