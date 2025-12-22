/**
 * Gregorio LSP Server
 * Main Language Server Protocol implementation for GABC files
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  DiagnosticSeverity,
  Diagnostic,
  DidChangeConfigurationNotification,
  DocumentSymbol,
  SymbolKind,
  Range as LspRange
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { GabcParser } from './parser/gabc-parser';
import { treeSitterParser } from './parser/tree-sitter-integration';
import { DocumentValidator } from './validation/validator';
import { analyzeSemantics } from './validation/semantic-analyzer';
import { ParseError } from './parser/types';

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create text document manager
const documents = new TextDocuments(TextDocument);

// Create validator
const validator = new DocumentValidator();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

// Linting configuration
interface LintingConfig {
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  onSave: boolean;
  ignoreRules: string[];
}

let lintingConfig: LintingConfig = {
  enabled: true,
  severity: 'warning',
  onSave: false,
  ignoreRules: []
};

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
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
  const useTreeSitter = treeSitterParser.isTreeSitterAvailable();
  connection.console.log(
    `Gregorio LSP Server initialized. Using ${useTreeSitter ? 'tree-sitter' : 'fallback'} parser.`
  );
  
  if (hasConfigurationCapability) {
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
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

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // If linting is disabled, clear diagnostics and return
  if (!lintingConfig.enabled) {
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
    return;
  }

  const text = textDocument.getText();
  
  // Always use TypeScript parser for full document parsing (including syllables and NABC)
  // This ensures validation rules have access to complete document structure
  const parser = new GabcParser(text);
  const parsedDoc = parser.parse();

  // Debug: Log NABC content
  connection.console.log(`[DEBUG] Validating document with ${parsedDoc.notation.syllables.length} syllables`);
  let nabcCount = 0;
  let fusedCount = 0;
  for (const syllable of parsedDoc.notation.syllables) {
    for (const note of syllable.notes) {
      if (note.nabc && note.nabc.length > 0) {
        nabcCount++;
        if (note.nabc.some(n => n.includes('!'))) {
          fusedCount++;
          connection.console.log(`[DEBUG] Found fused NABC: ${note.nabc.join(', ')}`);
        }
      }
    }
  }
  connection.console.log(`[DEBUG] Found ${nabcCount} notes with NABC, ${fusedCount} with fusion (!)`);

  // Validate the document with validation rules
  const errors = validator.validate(parsedDoc);
  connection.console.log(`[DEBUG] Validation produced ${errors.length} errors`);

  // Run semantic analysis
  const semanticErrors = analyzeSemantics(parsedDoc);

  // Combine all errors
  const allErrors = [...errors, ...semanticErrors];

  // Filter diagnostics based on configuration
  const filteredErrors = filterDiagnostics(allErrors);

  // Convert to LSP diagnostics
  const diagnostics: Diagnostic[] = filteredErrors.map(error => convertToDiagnostic(error));

  // Send diagnostics to client
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function filterDiagnostics(errors: ParseError[]): ParseError[] {
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

function convertToDiagnostic(error: ParseError): Diagnostic {
  const severity = 
    error.severity === 'error' ? DiagnosticSeverity.Error :
    error.severity === 'warning' ? DiagnosticSeverity.Warning :
    DiagnosticSeverity.Information;

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
  if (treeSitterParser.isTreeSitterAvailable()) {
    const tree = treeSitterParser.parse(text);
    if (tree) {
      const node = treeSitterParser.findNodeAt(tree, position);
      if (node) {
        const nodeText = treeSitterParser.getNodeText(node, text);
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
  const parser = new GabcParser(text);
  const parsed = parser.parse();

  const symbols: DocumentSymbol[] = [];

  // Add header symbols
  parsed.headers.forEach((value, name) => {
    const range: LspRange = {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 }
    };
    symbols.push(DocumentSymbol.create(
      `${name}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`,
      undefined,
      SymbolKind.String,
      range,
      range
    ));
  });

  return symbols;
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
