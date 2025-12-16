# Gregorio Language Support for VS Code

VS Code extension providing language support for GABC/NABC notation used in Gregorian chant composition.

## Features

### 🎵 Syntax Highlighting
- **Semantic highlighting**: Parser-based, context-aware syntax highlighting
- **TextMate grammar**: Fast, regex-based baseline highlighting
- Complete GABC notation support: pitches, neumes, modifiers, clefs, bars, spacing
- NABC support: pipe-separated alternations
- Header syntax with proper highlighting
- Syllable styling: bold, italic, underline, small caps, teletype, colored text
- Attributes: shape, stroke, custos, choral signs, braces, slurs, episema
- Customizable token colors for different note types and elements

### 🔍 Language Server Integration
- **Bundled LSP server**: No external dependencies required
- Real-time validation via gregorio-lsp
- Error detection for missing headers, NABC mismatches, invalid constructions
- Diagnostic reporting with precise locations
- Robust TypeScript-based parser (tree-sitter disabled to avoid native module issues)

### 🔬 Optional Linting
- Configurable GABC code linting
- Real-time or on-save diagnostics
- Severity level filtering (error, warning, info)
- Rule-based filtering to ignore specific diagnostics
- Quick toggle command for enabling/disabling linting

### ⚙️ Commands
- Restart Gregorio Language Server
- Toggle Linting
- Toggle Semantic Highlighting

## Requirements

**None!** The extension comes with a bundled LSP server that works out of the box.

### Optional: Custom LSP Server

If you want to use a custom or development version of gregorio-lsp, you can configure the path:

1. Set `gregorio.lsp.serverPath` in your settings to point to your custom server.js
2. The extension will use your custom server instead of the bundled one

The extension automatically searches for external LSP servers in:
1. `gregorio.lsp.serverPath` setting (if configured)
2. Bundled server (shipped with extension) - **default**
3. `../gregorio-lsp/dist/server.js` (sibling folder, for development)
4. `./gregorio-lsp/dist/server.js` (workspace subfolder)

## Extension Settings

### Language Server
* `gregorio.lsp.serverPath`: Custom path to gregorio-lsp server.js
* `gregorio.lsp.trace.server`: LSP communication tracing

### Linting
* `gregorio.linting.enabled`: Enable/disable linting (default: `true`)
* `gregorio.linting.severity`: Minimum severity to report: `error`, `warning`, or `info` (default: `warning`)
* `gregorio.linting.onSave`: Only lint when saving files (default: `false`)
* `gregorio.linting.ignoreRules`: Array of rule codes to ignore (default: `[]`)

### Highlighting
* `gregorio.highlighting.semantic`: Enable semantic syntax highlighting (default: `true`)

See [LINTING.md](docs/LINTING.md) for detailed linting documentation.
See [SEMANTIC_HIGHLIGHTING.md](docs/SEMANTIC_HIGHLIGHTING.md) for semantic highlighting details.

## Usage

1. Install the extension
2. Ensure gregorio-lsp is built
3. Open a \`.gabc\` file
4. Automatic activation, highlighting, and diagnostics

## Release Notes

### 0.1.0

Initial release with GABC/NABC syntax highlighting, LSP integration, and real-time diagnostics.

## License

MIT License
