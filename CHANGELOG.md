# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Tag highlighting** — all GABC text tags now use consistent HTML/XML-style
  scopes (`punctuation.definition.tag.begin/end`, `entity.name.tag`), so they
  render with the same color scheme as HTML tags in the active theme.
- **Nested tags** — tags like `<sp>` inside `<c>` (e.g. `<c><sp>V/</sp>.</c>`)
  now keep their own coloring; all markup tags include `#special-characters` in
  their inner patterns.
- **`<c>` content** — plain text inside `<c>…</c>` receives a red/rubric color
  (`markup.deleted` scope) while nested tags retain their original scopes.
- **Self-closing tags** — `<clear/>` / `<clear>` and all `<pr>` variants
  (`<pr/>`, `<pr>`, `<pr:0.5/>`, `<pr:0.5>`) are handled as self-closing
  `match` rules and no longer consume subsequent code.
- **`<eu>` and `<nlba>`** — correctly modelled as wrapping begin/end rules
  (they enclose multiple syllables); their inner patterns delegate to
  `#notation-body`.
- **`<alt>`** — added `<alt>…</alt>` to `#text-markup` (text above the staff).
- **Lyric centering `{}`** — removed differentiated coloring; `{vowel}` text
  is now treated as plain lyric text.
- **`$`-escaped delimiters** — `$(`, `$)`, `$[`, `$]`, `${`, `$}`, `$$` are
  now recognized as escape sequences. The escaped character receives the
  `string.other.escape` scope so VS Code's bracket-pair colorizer does not flag
  them as unbalanced delimiters. The escape rule is evaluated before
  `#notation-group` so `$(` is never mistakenly consumed as an open-notation
  parenthesis.

## [0.2.1] - 2026-06-20

### Fixed
- CI: add Rust toolchain, wasm-pack, and gregorio-lsp source checkout to
  publish and CI workflows so the WASM build succeeds in GitHub Actions.

## [0.2.0] - 2026-06-20

### Added
- **Built-in WASM engine** (default mode): `gregorio-core` compiled to
  `wasm32-unknown-unknown` via `wasm-bindgen` / `wasm-pack` is bundled
  inside the extension. No external installation required. Provides
  diagnostics, document formatting, and quick-fix code actions in-process.
- **Optional external LSP mode**: set `gregorio.languageServer.path` to a
  `gregorio-lsp` binary path (or bare name resolved from PATH) to use the
  full tower-lsp server instead. Provides all built-in features plus hover,
  completion, and document symbols. Changing the setting switches modes
  automatically without restarting VS Code.
- New settings:
  - `gregorio.languageServer.enabled` — enable/disable language features.
  - `gregorio.languageServer.path` — empty (default) = WASM; path = external.
  - `gregorio.languageServer.formatting` — `maxLineWidth`, `breakAfterClef`,
    `breakAfterBar`.
  - `gregorio.linting.severity` — minimum severity level (`error`, `warning`,
    `info`).
  - `gregorio.linting.ignoreCodes` — list of diagnostic codes to suppress.
- `gabc.restartLanguageServer` command: restarts the external LSP process
  (no-op in WASM mode).
- All editing commands (shift notes, fill empty groups, ligature conversion)
  now call `gregorio-core` WASM directly instead of TypeScript implementations.

### Changed
- `gregorio-lsp` client dependency (`vscode-languageclient`) is restored and
  used only in external mode; it is not activated when running in WASM mode.
- `src/transform.ts` removed; all text-transformation logic lives in Rust.
- Bundle now includes `dist/wasm/gregorio_core/` (WASM module and `.wasm`
  binary); the WASM source artifacts (`wasm/`) are excluded from the `.vsix`.

### Fixed
- Semantic highlighting `nabc_lines` count now comes from `gregorio-core` WASM
  (exact parser) with a pure-TS fallback; previously used a regex from
  `transform.ts`.

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
