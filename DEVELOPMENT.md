# Development Guide - vscode-gregorio

## Project Structure

```
vscode-gregorio/
├── src/
│   ├── extension.ts          # Main extension entry point with LSP client
│   └── test/
│       └── extension.test.ts # Extension tests
├── syntaxes/
│   └── gabc.tmLanguage.json  # TextMate grammar for syntax highlighting
├── language-configuration.json # Language configuration (brackets, comments)
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
└── esbuild.js              # Build configuration
```

## Setup

### Prerequisites
- Node.js (v16 or higher)
- npm
- VS Code (latest version)
- gregorio-lsp server built and available

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AISCGre-BR/vscode-gregorio.git
cd vscode-gregorio
```

2. Install dependencies:
```bash
npm install
```

3. Ensure gregorio-lsp is built:
```bash
cd ../gregorio-lsp
npm install
npm run build
```

## Development Workflow

### Building

Compile the extension:
```bash
npm run compile
```

Watch mode (auto-recompile on changes):
```bash
npm run watch
```

### Testing

Run tests:
```bash
npm test
```

### Debugging

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Open a `.gabc` file to test the extension
4. Check the Output panel → "Gregorio Language Server" for LSP logs

### Testing with a GABC file

Create a test file `test.gabc`:
```gabc
name: Test Chant;
mode: 8;
nabc-lines: 1;
%%
(c4) Ký(f|vi)ri(g)e(h) e(ixir1|to)lé(g)i(f)son.(f)
```

Open it in the Extension Development Host and verify:
- Syntax highlighting is applied
- Hovering shows information (if implemented)
- Errors are underlined with diagnostics

## LSP Integration

### Server Discovery

The extension searches for gregorio-lsp in:
1. `gregorio.lsp.serverPath` setting
2. `../gregorio-lsp/dist/server.js` (sibling folder)
3. `./gregorio-lsp/dist/server.js` (workspace subfolder)

### Configuring Server Path

If auto-discovery fails, set the path manually:

1. Open Settings (Ctrl+,)
2. Search for "gregorio"
3. Set "Gregorio: Lsp: Server Path" to your server.js location

Example:
```
/home/user/projects/gregorio-lsp/dist/server.js
```

## Syntax Highlighting

The TextMate grammar in `syntaxes/gabc.tmLanguage.json` provides:

- **Headers**: `name:`, `mode:`, `nabc-lines:`, etc.
- **Pitches**: `a-m`, `A-M`
- **Modifiers**: `o`, `w`, `q`, `v`, `s`, etc.
- **Clefs**: `c1`, `c2`, `c3`, `c4`, `f1`, `f2`, `f3`, `f4`
- **Bars**: `` ` ``, `,`, `;`, `:`, `::`, etc.
- **Spacing**: `!`, `@`, `/`, `//`
- **Attributes**: `[nv:...]`, `[alt:...]`, `[shape:...]`, etc.
- **NABC separator**: `|`
- **Syllable styles**: `<b>`, `<i>`, `<ul>`, `<sc>`, `<tt>`, `<c>`

### Customizing Colors

Users can customize colors in their VS Code theme by targeting these scopes:

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    {
      "scope": "constant.character.pitch.gabc",
      "settings": { "foreground": "#569CD6" }
    },
    {
      "scope": "keyword.control.clef.gabc",
      "settings": { "foreground": "#C586C0" }
    }
  ]
}
```

## Publishing

### Building for Distribution

Create a `.vsix` package:
```bash
npm install -g @vscode/vsce
npm run package
vsce package
```

This creates `vscode-gregorio-0.1.0.vsix`.

### Installing Locally

```bash
code --install-extension vscode-gregorio-0.1.0.vsix
```

### Publishing to Marketplace

1. Create a Personal Access Token at https://dev.azure.com
2. Create a publisher at https://marketplace.visualstudio.com/manage
3. Publish:
```bash
vsce publish
```

## Troubleshooting

### Extension doesn't activate

Check:
1. File has `.gabc` extension
2. Extension is installed and enabled
3. No errors in Developer Tools (Help → Toggle Developer Tools)

### LSP server not found

Check:
1. gregorio-lsp is built (`npm run build` in gregorio-lsp)
2. Server path is correct in settings
3. Check Output panel → "Gregorio Language Server"

### Syntax highlighting not working

Check:
1. File is recognized as GABC (status bar shows "GABC")
2. No syntax errors in `gabc.tmLanguage.json`
3. Reload window (Ctrl+R in Extension Development Host)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Related Projects

- [gregorio-lsp](https://github.com/AISCGre-BR/gregorio-lsp) - Language Server
- [tree-sitter-gregorio](https://github.com/AISCGre-BR/tree-sitter-gregorio) - Tree-sitter grammar

## License

MIT License - see LICENSE file for details.
