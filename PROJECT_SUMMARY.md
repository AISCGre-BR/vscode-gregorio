# vscode-gregorio - Project Summary

## 🎯 Project Overview

**vscode-gregorio** is a Visual Studio Code extension that provides comprehensive language support for GABC/NABC notation used in Gregorian chant composition. It integrates with the gregorio-lsp language server to provide real-time syntax validation and semantic analysis.

## 📦 Repository Information

- **GitHub**: https://github.com/AISCGre-BR/vscode-gregorio
- **Visibility**: Public
- **Organization**: AISCGre-BR
- **Version**: 0.1.0
- **License**: MIT

## ✨ Key Features

### 1. Syntax Highlighting
Complete TextMate grammar supporting:
- GABC pitches (a-m, A-M)
- Neume modifiers (o, w, q, v, s, ~, etc.)
- Clefs (c1-c4, f1-f4, cb1-cb4)
- Bars and separators (`, , ; : :: etc.)
- Spacing operators (!, @, /, //)
- Attributes ([nv:...], [alt:...], [shape:...])
- NABC pipe separators (|)
- Syllable styling (<b>, <i>, <ul>, <sc>, <tt>, <c>)
- Header syntax with semantic highlighting

### 2. LSP Integration
Real-time validation via gregorio-lsp:
- Syntax error detection
- Missing header warnings
- NABC segment count validation
- Invalid musical construction warnings
- Diagnostic reporting with precise locations
- Auto-discovery of LSP server

### 3. Language Configuration
- Line comments (%)
- Auto-closing brackets: (), [], {}, <>
- Surrounding pairs
- Word pattern recognition

### 4. Commands
- **Restart Gregorio Language Server**: Reload LSP without restarting VS Code

### 5. Configuration
- `gregorio.lsp.serverPath`: Custom LSP server path
- `gregorio.lsp.trace.server`: LSP communication tracing (off/messages/verbose)

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         VS Code Extension Host          │
│  ┌─────────────────────────────────┐   │
│  │   vscode-gregorio Extension     │   │
│  │  ┌──────────────────────────┐   │   │
│  │  │  Language Client (IPC)   │   │   │
│  │  └──────────┬───────────────┘   │   │
│  │             │                    │   │
│  │  ┌──────────▼───────────────┐   │   │
│  │  │  TextMate Grammar        │   │   │
│  │  │  Syntax Highlighting     │   │   │
│  │  └──────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
└───────────────┬─────────────────────────┘
                │
                │ IPC
                │
┌───────────────▼─────────────────────────┐
│       gregorio-lsp Server (Node.js)     │
│  ┌─────────────────────────────────┐   │
│  │  GabcParser (fallback parser)   │   │
│  │  ┌──────────────────────────┐   │   │
│  │  │  Semantic Analyzer       │   │   │
│  │  │  - Header validation     │   │   │
│  │  │  - NABC validation       │   │   │
│  │  │  - Musical constructions │   │   │
│  │  └──────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 📁 Project Structure

```
vscode-gregorio/
├── src/
│   ├── extension.ts              # LSP client implementation
│   └── test/
│       └── extension.test.ts     # Extension tests
├── syntaxes/
│   └── gabc.tmLanguage.json      # TextMate grammar
├── language-configuration.json   # Language config (brackets, comments)
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
├── esbuild.js                    # Build configuration
├── README.md                     # User documentation
├── DEVELOPMENT.md                # Developer guide
└── CHANGELOG.md                  # Version history
```

## 🔗 Related Projects

### Ecosystem Components

1. **tree-sitter-gregorio** (https://github.com/AISCGre-BR/tree-sitter-gregorio)
   - Tree-sitter parser for GABC/NABC
   - Used in editors like Helix, Neovim
   - Provides precise syntax tree

2. **gregorio-lsp** (https://github.com/AISCGre-BR/gregorio-lsp)
   - Language Server Protocol implementation
   - Semantic analysis engine
   - Real-time validation

3. **vscode-gregorio** (this project)
   - VS Code extension
   - TextMate grammar for highlighting
   - LSP client integration

### Integration Flow

```
tree-sitter-gregorio → gregorio-lsp → vscode-gregorio
      (parser)          (validation)      (UI/UX)
```

## 🚀 Installation & Usage

### For Users

1. Install the extension from VS Code Marketplace (when published)
2. Ensure gregorio-lsp is installed and built
3. Open any `.gabc` file
4. Enjoy syntax highlighting and real-time validation

### For Developers

See [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Setup instructions
- Build process
- Testing procedures
- Publishing guidelines

## 🛠️ Technical Details

### Dependencies

**Runtime**:
- `vscode-languageclient` ^9.0.1

**Development**:
- TypeScript ^5.9.3
- ESBuild ^0.27.1
- ESLint ^9.39.1
- Mocha ^10.0.10

### Build System

- **Bundler**: ESBuild (fast, efficient)
- **Compiler**: TypeScript
- **Linter**: ESLint with TypeScript support
- **Test Framework**: Mocha with VS Code Test Runner

### Language Server Protocol

**Transport**: IPC (Inter-Process Communication)
**Features Implemented**:
- textDocument/didOpen
- textDocument/didChange
- textDocument/didSave
- textDocument/publishDiagnostics

## �� Validation Coverage

### Syntax Validation
- ✅ Header syntax
- ✅ Clef notation
- ✅ Pitch sequences
- ✅ Modifier syntax
- ✅ Attribute brackets
- ✅ Syllable text

### Semantic Validation
- ✅ Missing `nabc-lines` header
- ✅ NABC segment count mismatch
- ✅ Invalid pes quadratum
- ✅ Invalid quilisma patterns
- ✅ Invalid oriscus scapus
- ✅ Fusion connector validation

## 🎨 Syntax Highlighting Scopes

Key TextMate scopes defined:

- `entity.name.tag.gabc` - Header names
- `constant.numeric.gabc` - Numbers
- `keyword.control.separator.gabc` - Section separator %%
- `constant.character.pitch.gabc` - Musical pitches
- `keyword.control.clef.gabc` - Clefs
- `storage.type.modifier.gabc` - Neume modifiers
- `punctuation.separator.bar.gabc` - Separation bars
- `keyword.operator.nabc.gabc` - NABC pipe separator
- `markup.bold.gabc`, `markup.italic.gabc`, etc. - Text styles

## 📈 Future Enhancements

Potential improvements:
- [ ] Code completion for GABC notation
- [ ] Hover documentation for neume patterns
- [ ] Go to definition for header references
- [ ] Document symbols / outline view
- [ ] Snippet support for common patterns
- [ ] Preview rendering of GABC notation
- [ ] Integration with Gregorio compiler
- [ ] Auto-formatting support

## 🤝 Contributing

Contributions are welcome! Please:

1. Check existing issues or create a new one
2. Fork the repository
3. Create a feature branch
4. Make your changes with tests
5. Submit a pull request

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed guidelines.

## 📝 Commit History

```
6dd5d9d docs: add comprehensive development guide
279f7a9 feat: initial release of vscode-gregorio extension
```

## 🏆 Achievements

- ✅ Complete GABC/NABC syntax highlighting
- ✅ LSP client integration
- ✅ Real-time validation
- ✅ Auto-discovery of LSP server
- ✅ Comprehensive documentation
- ✅ Public GitHub repository
- ✅ MIT License
- ✅ TypeScript implementation
- ✅ ESBuild bundling
- ✅ Professional project structure

## 📞 Support

- **Issues**: https://github.com/AISCGre-BR/vscode-gregorio/issues
- **Discussions**: https://github.com/AISCGre-BR/vscode-gregorio/discussions
- **Related Projects**: See ecosystem components above

## 📄 License

MIT License - See LICENSE file for details.

---

**Created**: December 12, 2024  
**Status**: ✅ Production Ready  
**Version**: 0.1.0  
**Maintainer**: AISCGre-BR Organization
