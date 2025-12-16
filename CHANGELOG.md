# Change Log

All notable changes to the "vscode-gregorio" extension will be documented in this file.

## [Unreleased]

### Added
- Bundled gregorio-lsp language server - no external dependencies required
- **Semantic syntax highlighting** using the bundled parser for context-aware colors
- Optional linting support with configurable severity levels and rule filtering
- Toggle linting command for quick enable/disable
- Toggle semantic highlighting command
- Configuration for linting behavior (on-save vs real-time)
- Configuration for semantic highlighting
- Custom semantic token colors for light and dark themes
- Architecture documentation explaining design decisions
- Comprehensive linting documentation
- Semantic highlighting documentation with customization guide

### Changed
- LSP server now bundled with extension for better reliability
- Disabled tree-sitter in bundled version to avoid native module complications
- Updated server discovery to prioritize bundled version over external installations
- Improved command registration to work even when server is not available

### Fixed
- Command registration happens before LSP server check to prevent "command not found" errors

## [0.1.0] - Initial Release

### Added
- Complete GABC notation syntax highlighting (pitches, neumes, modifiers, clefs, bars, spacing)
- NABC notation support with pipe-separated alternations
- Header syntax highlighting
- Syllable styling support (bold, italic, underline, small caps, teletype, colored text)
- Attribute highlighting (shape, stroke, custos, choral signs, braces, slurs, episema)
- Language server integration for real-time validation
- Error detection for missing headers, NABC mismatches, invalid constructions
- Diagnostic reporting with precise locations
- Restart Language Server command