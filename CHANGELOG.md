# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-06-17

### Fixed

- **LaTeX embedding** — `<v>…</v>` verbatim tags now use inline TextMate
  patterns instead of a full grammar include, so `\command{}` macros, math
  (`$…$`), and brace groups are highlighted correctly without requiring
  LaTeX Workshop.
- **Pitch colors** — pitch letters (e.g. `f`, `g`, `h`) now use the
  `entity.name.type` TextMate scope and the `type` semantic token, rendering
  teal (`#4ec9b0`) in Dark+ and equivalent colors in other themes.
- **Modifier colors** — quilisma (`w`), oriscus (`o`), and cavum (`r`)
  now use `variable.parameter.modifier.*` scopes, rendering in a distinct
  light blue so they are visually separable from pitch letters.
- **Section separator (`%%`)** — now rendered with `keyword` color (blue)
  instead of the default operator color, making the header/body boundary
  immediately visible.
- **Comment highlighting** — multiple fixes:
  - Bare `%` lines and `%%%` lines are now correctly highlighted as
    comments (the built-in tokenizer's section-separator regex was too
    broad and matched any `%+` sequence).
  - Inline comments after a header's closing `;` (e.g.
    `commentary: MR 1156; % note`) are now highlighted as comments in
    both the built-in tokenizer and the TextMate grammar.
  - The TextMate `begin`/`end` block for latex-capable headers now
    closes at `;` even when followed by an inline `%` comment, preventing
    subsequent lines from being miscolored as string values.
  - The TextMate comment pattern now covers `%` alone, `% text`, `%%%`,
    etc. with a single rule that correctly excludes the `%%` separator.
  - The tree-sitter path collects all tokens into a sorted list and
    deduplicates overlapping spans before building the semantic token
    stream, preventing malformed output for lines with nested tree-sitter
    nodes.

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
