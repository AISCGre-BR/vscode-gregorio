# Gregorio (GABC/NABC) — VS Code Extension

> [!NOTE]
> **AI-Assisted Development**
>
> This project is developed, fully or in part, with LLM/generative AI assistance.
> All LLM-proposed changes go through human review and local testing before being committed.
>
> If you object to software built with generative AI assistance, we respect your opinion
> and regret we cannot meet your expectations. In that case, we kindly recommend exploring
> alternative solutions. If you know of any, feel free to open an issue — we'll be happy
> to include them in our documentation.

Adds support for **GABC/NABC** (Gregorian chant notation) files to Visual Studio Code.

This is the VS Code counterpart of [zed-gregorio](https://github.com/AISCGre-BR/zed-gregorio)
and [gregorio.nvim](https://github.com/AISCGre-BR/gregorio.nvim), sharing the same
ecosystem: the [tree-sitter-gregorio](https://github.com/AISCGre-BR/tree-sitter-gregorio)
grammar and the [gregorio-lsp](https://github.com/AISCGre-BR/gregorio-lsp) language server.

## Features

- **Syntax highlighting** — A TextMate grammar provides instant, dependency-free
  highlighting for GABC headers, pitches, clefs, neumes, bars, alterations, style
  tags, NABC notation, and comments.
- **Semantic highlighting (tree-sitter)** — On top of the TextMate baseline, a
  semantic layer powered by **tree-sitter-gregorio** understands the code's
  structure, including the **GABC/NABC block alternation governed by the
  `nabc-lines` header**. When the tree-sitter grammar is unavailable, a built-in
  tokenizer reproduces the same `nabc-lines`-aware alternation so the feature
  always works.
- **LaTeX embedding** — TeX code inside `<v>…</v>` tags and verbatim attributes
  (`[nv:…]`, `[gv:…]`, `[ev:…]`) is highlighted as LaTeX.
- **Language server** — Diagnostics, hover, completion, document symbols, and
  document formatting via [gregorio-lsp](https://github.com/AISCGre-BR/gregorio-lsp)
  (formatting uses the embedded `grefmt` engine).
- **Editing commands**
  - **Shift Notes Up / Down** (`Ctrl+Alt+Up` / `Ctrl+Alt+Down`) — transpose note
    letters diatonically, wrapping cyclically. With `nabc-lines`, only GABC
    segments are transposed; NABC segments are preserved.
  - **Fill Empty Note Groups** (`Ctrl+Alt+L`) — fill empty `()` groups with the
    last pitch of the preceding group.
  - **Convert Ligatures ↔ `<sp>` Tags** — swap `æ`/`ǽ`/`œ` for their `<sp>` tags.
- **Snippets** — Header templates (GABC and NABC), markup tags, divisiones, and
  common response markings.

## Requirements

Syntax highlighting works out of the box. For **language-server** features
(diagnostics, hover, completion, formatting), install `gregorio-lsp`:

```sh
cargo install --git https://github.com/AISCGre-BR/gregorio-lsp \
  --tag v0.9.0 --bin gregorio-lsp
```

Make sure `~/.cargo/bin` (or wherever the binary lands) is on your `PATH`, or set
`gregorio.languageServer.path` to its absolute location.

## Commands

| Command | Default keybinding |
|---|---|
| Gregorio: Shift Notes Up | `Ctrl+Alt+Up` |
| Gregorio: Shift Notes Down | `Ctrl+Alt+Down` |
| Gregorio: Fill Empty Note Groups | `Ctrl+Alt+L` |
| Gregorio: Convert Ligatures to `<sp>` Tags | — |
| Gregorio: Convert `<sp>` Tags to Ligatures | — |
| Gregorio: Restart Language Server | — |

All editing commands operate on the current selection, or on the whole chant
body (everything after `%%`) when there is no selection. The header is never
modified.

## Settings

| Setting | Default | Description |
|---|---|---|
| `gregorio.languageServer.enabled` | `true` | Enable gregorio-lsp. |
| `gregorio.languageServer.path` | `gregorio-lsp` | Path to the server binary. |
| `gregorio.languageServer.formatting.maxLineWidth` | `80` | Max characters per notation line. |
| `gregorio.languageServer.formatting.breakAfterClef` | `false` | Break after each clef. |
| `gregorio.languageServer.formatting.breakAfterBar` | `false` | Break after each bar. |
| `gregorio.semanticHighlighting.enabled` | `true` | Enable tree-sitter semantic highlighting. |

Format a document with **Format Document** (`Shift+Alt+F`) or enable format on
save for GABC:

```jsonc
"[gabc]": { "editor.formatOnSave": true }
```

## Semantic highlighting and the tree-sitter grammar

The semantic layer prefers the compiled **tree-sitter-gregorio** WASM grammar,
whose external scanner resolves the GABC/NABC alternation per the `nabc-lines`
header. Build the grammar and bundle it with:

```sh
npm install
npm run build:wasm   # requires the tree-sitter CLI + Emscripten/Docker
```

This produces `parser/tree-sitter-gregorio.wasm` (pinned to grammar v0.5.2,
matching zed-gregorio / gregorio.nvim). If the grammar is absent, the extension
falls back to the built-in `nabc-lines`-aware tokenizer.

## Development

```sh
npm install
npm run watch     # bundle with esbuild in watch mode
# Press F5 in VS Code to launch the Extension Development Host
npm run compile   # type-check
npm test          # unit tests for the GABC transforms
npm run package   # build a .vsix
```

## License

MIT — Copyright (c) 2026 AISCGre Brasil. See [LICENSE](LICENSE).

The extension icon is a recolored version of the King David illustration from the
[Gregorio Project](https://github.com/gregorio-project/gregorio-project.github.io).
