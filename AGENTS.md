# AGENTS.md — AI Code Generation Guide for vscode-gregorio

This document is the primary reference for AI agents contributing to this
repository. Read it before making changes.

> **Language policy**: All content in this repository **must be in English** —
> source identifiers, comments, documentation, commit messages, and any other
> human-readable text.

## 1. Project Overview

`vscode-gregorio` is a Visual Studio Code extension for **GABC/NABC** Gregorian
chant notation. It is the VS Code counterpart of `zed-gregorio` and
`gregorio.nvim` and integrates the same ecosystem:

- **[tree-sitter-gregorio](https://github.com/AISCGre-BR/tree-sitter-gregorio)** —
  grammar used for semantic highlighting (pinned to v0.5.2, commit `c9034de8`).
- **[gregorio-lsp](https://github.com/AISCGre-BR/gregorio-lsp)** — language server
  (diagnostics, hover, completion, document symbols, formatting via `grefmt`).

## 2. Repository Structure

```
package.json                     ← extension manifest (contributes, commands, config)
language-configuration.json      ← brackets, comments, auto-closing
syntaxes/gabc.tmLanguage.json    ← TextMate grammar (baseline highlighting)
languages/gabc/
  highlights.scm                 ← tree-sitter highlight query (semantic tokens)
  injections.scm                 ← LaTeX injection query
snippets/gabc.code-snippets      ← snippets
src/
  extension.ts                   ← activate/deactivate; wiring
  commands.ts                    ← VS Code command handlers
  transform.ts                   ← pure GABC text transforms (unit-tested)
  lsp.ts                         ← gregorio-lsp LanguageClient
  semanticTokens.ts              ← DocumentSemanticTokensProvider (+ builtin fallback)
  treesitter.ts                  ← web-tree-sitter loader (optional WASM grammar)
test/transform.test.ts           ← unit tests for transform.ts
scripts/build-wasm.sh            ← builds parser/tree-sitter-gregorio.wasm
images/icon.png                  ← green liturgical icon
```

## 3. Development Workflow

```sh
npm install
npm run watch      # esbuild bundle in watch mode (dist/extension.js)
npm run compile    # tsc type-check (no emit)
npm test           # node --test on transform.ts (Node 22+ for .ts type stripping)
npm run build:wasm # build the tree-sitter grammar into parser/ (optional)
npm run package    # produce a .vsix
```

Press **F5** to launch the Extension Development Host.

## 4. Architecture Notes

### 4.1 Highlighting is two-layered

1. **TextMate grammar** (`syntaxes/gabc.tmLanguage.json`) — always on, provides
   baseline colors and LaTeX embedding.
2. **Semantic tokens** (`src/semanticTokens.ts`) — augments the TextMate layer.
   It prefers the **tree-sitter-gregorio** grammar (`src/treesitter.ts`) and
   falls back to a built-in tokenizer when the WASM grammar is not present. Both
   honour the `nabc-lines` header to color GABC vs NABC segments.

When editing semantic-token logic, keep the built-in fallback and the
tree-sitter path consistent: GABC pitches → `number`, NABC blocks → `function`.

### 4.2 Text transforms live in `transform.ts`

`src/transform.ts` is framework-agnostic and unit-tested. The note-shift and
fill-parens algorithms are ported from `gregorio.nvim`
(`lua/gregorio/commands.lua`) — preserve their `nabc-lines` semantics: in a group
`(s0|s1|…|sN)`, segment `i` is GABC when `i % (nabc-lines + 1) === 0`. Keep new
editing behaviour in `transform.ts` (pure) and wire it up in `commands.ts`.

### 4.3 Language server

`src/lsp.ts` starts `gregorio-lsp` over stdio. The binary is a Rust executable
resolved from `gregorio.languageServer.path` (PATH by default). Do **not** add an
npm/npx fallback. Formatting options are forwarded via `initializationOptions`
and synchronized configuration.

## 5. Key Constraints

- **Grammar version pinning**: `scripts/build-wasm.sh` pins the grammar commit.
  When updating, change `GRAMMAR_REV`, rebuild the WASM, and review
  `languages/gabc/*.scm` for renamed/removed node kinds.
- **Robust activation**: the tree-sitter loader must never throw during
  activation — it is guarded and falls back silently.
- **English-only** text, **Conventional Commits** (`feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`, `test:`).

## 6. Companion Projects

| Project | Role |
|---|---|
| tree-sitter-gregorio | Grammar; built into `parser/*.wasm` |
| gregorio-lsp | Language server binary (installed by the user) |
| zed-gregorio / gregorio.nvim | Sister extensions; keep feature parity |
