# Gregorio Language Support for VS Code

VS Code extension providing language support for GABC/NABC notation used in Gregorian chant composition.

## Features

### 🎵 Syntax Highlighting
- Complete GABC notation support: pitches, neumes, modifiers, clefs, bars, spacing
- NABC support: pipe-separated alternations
- Header syntax with proper highlighting
- Syllable styling: bold, italic, underline, small caps, teletype, colored text
- Attributes: shape, stroke, custos, choral signs, braces, slurs, episema

### 🔍 Language Server Integration
- Real-time validation via gregorio-lsp
- Error detection for missing headers, NABC mismatches, invalid constructions
- Diagnostic reporting with precise locations
- Auto-discovery of gregorio-lsp server

### 🔬 Optional Linting
- Configurable GABC code linting
- Real-time or on-save diagnostics
- Severity level filtering (error, warning, info)
- Rule-based filtering to ignore specific diagnostics
- Quick toggle command for enabling/disabling linting

### ⚙️ Commands
- Restart Gregorio Language Server
- Toggle Linting

## Requirements

Requires **gregorio-lsp** server. The extension searches in:
1. `gregorio.lsp.serverPath` setting
2. `../gregorio-lsp/dist/server.js` (sibling folder)
3. `./gregorio-lsp/dist/server.js` (workspace subfolder)

### Installing gregorio-lsp

\`\`\`bash
git clone https://github.com/AISCGre-BR/gregorio-lsp.git
cd gregorio-lsp
npm install
npm run build
\`\`\`

## Extension Settings

### Language Server
* `gregorio.lsp.serverPath`: Custom path to gregorio-lsp server.js
* `gregorio.lsp.trace.server`: LSP communication tracing

### Linting
* `gregorio.linting.enabled`: Enable/disable linting (default: `true`)
* `gregorio.linting.severity`: Minimum severity to report: `error`, `warning`, or `info` (default: `warning`)
* `gregorio.linting.onSave`: Only lint when saving files (default: `false`)
* `gregorio.linting.ignoreRules`: Array of rule codes to ignore (default: `[]`)

See [LINTING.md](docs/LINTING.md) for detailed linting documentation.

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
