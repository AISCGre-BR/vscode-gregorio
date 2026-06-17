# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-17

### Added

- Initial release of the VS Code extension for GABC/NABC Gregorian chant
  notation, sharing the tree-sitter-gregorio grammar and gregorio-lsp language
  server with [zed-gregorio](https://github.com/AISCGre-BR/zed-gregorio) and
  [gregorio.nvim](https://github.com/AISCGre-BR/gregorio.nvim).
- TextMate grammar for baseline syntax highlighting (headers, pitches, clefs,
  neumes, bars, alterations, style tags, NABC notation, comments) with LaTeX
  embedding in verbatim tags and attributes.
- Tree-sitter-gregorio semantic highlighting with a built-in `nabc-lines`-aware
  fallback tokenizer for the GABC/NABC block alternation.
- gregorio-lsp client: diagnostics, hover, completion, document symbols, and
  document formatting (configurable `maxLineWidth`, `breakAfterClef`,
  `breakAfterBar`).
- Editing commands: Shift Notes Up/Down (nabc-lines-aware), Fill Empty Note
  Groups, and Convert Ligatures ↔ `<sp>` Tags.
- Snippets for header templates (GABC and NABC), markup tags, divisiones, and
  response markings.
- Green liturgical icon (recolored Gregorio Project logo).
